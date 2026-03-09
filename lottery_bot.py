"""
Initia Lottery Bot
매일 GitHub Actions에서 실행되어 draw를 마감하고 새 라운드를 오픈합니다.

실행 순서:
  1. execute_draw(draw_id)   - 당첨번호 추첨
  2. finalize_draw(draw_id)  - 당첨금 계산 확정
  3. force_new_draw()        - 새 회차 오픈
"""

import os
import sys
import time
import json
import logging
import subprocess
from typing import Any

# ─── Logging ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.DEBUG if os.getenv("LOG_LEVEL") == "debug" else logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%SZ",
)
log = logging.getLogger("lottery-bot")

# ─── Config ───────────────────────────────────────────────────────────────────

MNEMONIC               = os.environ["MNEMONIC"]
LOTTERY_MODULE_ADDRESS = os.getenv("LOTTERY_MODULE_ADDRESS", "0x2293569A34B1915D873A362E887FE9875DDF30B4")
NODE_RPC               = os.getenv("NODE_RPC", "https://sequencer-rpc-lotteria-1.anvil.asia-southeast.initia.xyz:443")
CHAIN_ID               = os.getenv("CHAIN_ID", "lotteria-1")
GAS                    = os.getenv("GAS", "1000000")
FEES                   = os.getenv("FEES", "20000l2/fbee3e5792cd4f22153623725eabd4aeac56fe1093abb39ed05403bfcdd3c15f")
KEY_NAME               = os.getenv("KEY_NAME", "admin")
SLEEP_BETWEEN_TX       = int(os.getenv("SLEEP_BETWEEN_TX", "8"))

# ─── CLI Helpers ──────────────────────────────────────────────────────────────

def run_cmd(cmd: list[str], input_text: str | None = None, check: bool = True) -> dict[str, Any]:
    log.debug(f"$ {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True, input=input_text)

    if check and result.returncode != 0:
        log.error(f"Command failed:\nSTDOUT: {result.stdout}\nSTDERR: {result.stderr}")
        raise RuntimeError(f"Command failed: {result.stderr or result.stdout}")

    output = result.stdout.strip()
    try:
        return json.loads(output)
    except json.JSONDecodeError:
        return {"raw": output}


def tx_flags() -> list[str]:
    return [
        "--chain-id", CHAIN_ID,
        "--node",     NODE_RPC,
        "--gas",      GAS,
        "--fees",     FEES,
        "--from",     KEY_NAME,
        "--keyring-backend", "test",
        "--yes",
        "--output",   "json",
    ]


def query_flags() -> list[str]:
    return [
        "--node",   NODE_RPC,
        "--output", "json",
    ]


# ─── Wallet Setup ─────────────────────────────────────────────────────────────

def setup_wallet() -> str:
    """Import mnemonic into test keyring (no passphrase, safe for CI)."""
    log.info("Importing wallet from mnemonic...")

    proc = subprocess.run(
        [
            "initiad", "keys", "add", KEY_NAME,
            "--recover",
            "--keyring-backend", "test",
        ],
        input=f"{MNEMONIC}\n",
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0 and "already exists" not in proc.stderr:
        log.warning(f"Key import warning: {proc.stderr}")

    result = run_cmd([
        "initiad", "keys", "show", KEY_NAME,
        "--keyring-backend", "test",
        "--address",
    ])
    address = result.get("raw", "").strip()
    if not address:
        raise RuntimeError("Could not retrieve admin address")

    log.info(f"Admin address: {address}")
    return address


# ─── View: Get Current Draw ID ────────────────────────────────────────────────

def get_current_draw_id() -> int:
    log.info("Querying current draw ID...")
    result = run_cmd([
        "initiad", "query", "move", "view",
        LOTTERY_MODULE_ADDRESS,
        "lottery",
        "get_current_draw_id",
        "--args", json.dumps([f"address:{LOTTERY_MODULE_ADDRESS}"]),
        *query_flags(),
    ])
    draw_id = int(result.get("data", "1"))
    log.info(f"Current draw ID: {draw_id}")
    return draw_id


# ─── View: Get Draw Info ──────────────────────────────────────────────────────

def get_draw_info(draw_id: int) -> dict[str, Any]:
    log.info(f"Querying draw info for draw_id={draw_id}...")
    result = run_cmd([
        "initiad", "query", "move", "view",
        LOTTERY_MODULE_ADDRESS,
        "lottery",
        "get_draw_info",
        "--args", json.dumps([f"address:{LOTTERY_MODULE_ADDRESS}", f"u64:{draw_id}"]),
        *query_flags(),
    ])
    data = result.get("data", [])
    if isinstance(data, list) and len(data) == 7:
        info = {
            "start_time":       int(data[0]),
            "end_time":         int(data[1]),
            "total_prize_pool": int(data[2]),
            "is_drawn":         bool(data[3]),
            "claim_deadline":   int(data[4]),
            "is_finalized":     bool(data[5]),
            "is_expired":       bool(data[6]),
        }
        log.debug(f"Draw info: {info}")
        return info
    log.warning(f"Unexpected draw info format: {result}")
    return {}


# ─── Transactions ─────────────────────────────────────────────────────────────

def execute_move_entry(function_name: str, typed_args: list[str]) -> str:
    """
    Call a Move entry function.
    typed_args: list of "type:value" strings, e.g. ["u64:5"]
    """
    cmd = [
        "initiad", "tx", "move", "execute",
        LOTTERY_MODULE_ADDRESS,
        "lottery",
        function_name,
    ]
    if typed_args:
        cmd += ["--args", json.dumps(typed_args)]
    cmd += tx_flags()

    log.debug(f"$ {' '.join(cmd)}")
    proc = subprocess.run(cmd, capture_output=True, text=True)

    if proc.returncode != 0:
        log.error(f"TX failed:\nSTDOUT: {proc.stdout}\nSTDERR: {proc.stderr}")
        raise RuntimeError(f"TX failed: {proc.stderr or proc.stdout}")

    try:
        data = json.loads(proc.stdout)
    except json.JSONDecodeError:
        data = {"raw": proc.stdout.strip()}

    if data.get("code", 0) != 0:
        raise RuntimeError(f"TX error code {data['code']}: {data.get('raw_log', '')}")

    return data.get("txhash", data.get("raw", "unknown"))


def execute_draw(draw_id: int) -> str:
    log.info(f"execute_draw(draw_id={draw_id})...")
    tx = execute_move_entry("execute_draw", [f"u64:{draw_id}"])
    log.info(f"execute_draw OK | tx: {tx}")
    return tx


def finalize_draw(draw_id: int) -> str:
    log.info(f"finalize_draw(draw_id={draw_id})...")
    tx = execute_move_entry("finalize_draw", [f"u64:{draw_id}"])
    log.info(f"finalize_draw OK | tx: {tx}")
    return tx


def force_new_draw() -> str:
    log.info("force_new_draw()...")
    tx = execute_move_entry("force_new_draw", [])
    log.info(f"force_new_draw OK | tx: {tx}")
    return tx


# ─── Main Cycle ───────────────────────────────────────────────────────────────

def run_daily_cycle():
    log.info("=" * 55)
    log.info("  Lottery daily cycle starting")
    log.info("=" * 55)

    admin_address = setup_wallet()
    draw_id = get_current_draw_id()
    draw_info = get_draw_info(draw_id)

    if not draw_info.get("is_drawn"):
        execute_draw(draw_id)
        log.info(f"Waiting {SLEEP_BETWEEN_TX}s...")
        time.sleep(SLEEP_BETWEEN_TX)
    else:
        log.info(f"draw_id={draw_id} already drawn, skipping execute_draw.")

    draw_info = get_draw_info(draw_id)
    if draw_info.get("is_drawn") and not draw_info.get("is_finalized"):
        finalize_draw(draw_id)
        log.info(f"Waiting {SLEEP_BETWEEN_TX}s...")
        time.sleep(SLEEP_BETWEEN_TX)
    else:
        log.info(f"draw_id={draw_id} already finalized, skipping finalize_draw.")

    force_new_draw()
    time.sleep(SLEEP_BETWEEN_TX)

    new_draw_id = get_current_draw_id()
    log.info(f"New draw opened! draw_id={new_draw_id}")
    log.info("=" * 55)
    log.info("  Cycle complete!")
    log.info("=" * 55)


# ─── Entry Point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    missing = [v for v in ["MNEMONIC"] if not os.getenv(v)]
    if missing:
        log.error(f"Missing required env vars: {', '.join(missing)}")
        sys.exit(1)

    run_daily_cycle()