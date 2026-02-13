#!/bin/bash

for i in {1..10}
do
  echo "Buying ticket $i..."
  initiad tx move execute \
    0x9b5de3d188d236e71edbdaba157c4d888d50cbcd \
    lottery \
    buy_ticket \
    --args "[\"vector<u8>:$i,$((i+5)),$((i+10)),$((i+15)),$((i+20)),$((i+25))\"]" \
    --from rollup-wallet \
    --node https://sequencer-rpc-lotteria-1.anvil.asia-southeast.initia.xyz:443 \
    --chain-id lotteria-1 \
    --gas auto \
    --gas-adjustment 1.5 \
    --yes
  
  sleep 2
done

echo "✅ All 10 tickets submitted!"
