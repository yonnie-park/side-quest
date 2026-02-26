module lottery::lottery {
    use std::signer;
    use std::vector;
    use std::error;
    use lottery::lottery_random;
    use initia_std::fungible_asset::Metadata;
    use initia_std::object::{Self, ExtendRef};
    use initia_std::primary_fungible_store;
    use initia_std::block;
    use initia_std::table::{Self, Table};

    const ENOT_ADMIN: u64 = 1;
    const EINVALID_NUMBERS: u64 = 2;
    const EDUPLICATE_NUMBERS: u64 = 3;
    const ENUMBER_OUT_OF_RANGE: u64 = 4;
    const EINSUFFICIENT_PAYMENT: u64 = 5;
    const ELOTTERY_NOT_INITIALIZED: u64 = 6;
    const EDRAW_NOT_COMPLETE: u64 = 7;
    const ENO_PRIZE: u64 = 8;
    const EALREADY_CLAIMED: u64 = 9;
    const EDRAW_NOT_FOUND: u64 = 10;
    const EDRAW_STILL_ACTIVE: u64 = 11;
    const ECLAIM_DEADLINE_PASSED: u64 = 12;
    const ECLAIMS_NOT_EXPIRED: u64 = 13;
    const EALREADY_EXPIRED: u64 = 14;
    const ENOT_FINALIZED: u64 = 15;
    const EALREADY_FINALIZED: u64 = 16;

    const MIN_NUMBER: u8 = 1;
    const MAX_NUMBER: u8 = 20;
    const NUMBERS_TO_PICK: u64 = 6;
    const TICKET_PRICE: u64 = 5000000;
    const DRAW_DURATION: u64 = 86400;
    const CLAIM_DURATION: u64 = 604800;

    const PRIZE_TIER_6: u64 = 40;
    const PRIZE_TIER_5: u64 = 25;
    const PRIZE_TIER_4: u64 = 15;
    const PRIZE_TIER_3: u64 = 12;
    const PRIZE_TIER_2: u64 = 8;

    struct LotteryConfig has key {
        admin: address,
        current_draw_id: u64,
        ticket_price: u64,
        total_tickets_sold: u64,
        extend_ref: ExtendRef,
        vault_addr: address,
    }

    struct DrawStore has key {
        draws: Table<u64, Draw>,
        draw_tickets: Table<u64, vector<TicketEntry>>,
    }

    struct Draw has store {
        id: u64,
        start_time: u64,
        end_time: u64,
        total_prize_pool: u64,
        total_claimed: u64,
        winning_numbers: vector<u8>,
        bonus_number: u8,
        is_drawn: bool,
        prizes_distributed: bool,
        claim_deadline: u64,
        rollover_amount: u64,
        is_expired: bool,
        prize_per_winner: vector<u64>,
        is_finalized: bool,
    }

    struct TicketEntry has store, copy, drop {
        owner: address,
        numbers: vector<u8>,
    }

    struct Ticket has store, drop {
        draw_id: u64,
        owner: address,
        numbers: vector<u8>,
        timestamp: u64,
        claimed: bool,
    }

    struct TicketCollection has key {
        tickets: vector<Ticket>,
    }

    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        assert!(!exists<LotteryConfig>(admin_addr), error::already_exists(ELOTTERY_NOT_INITIALIZED));

        let (_, current_time) = block::get_block_info();

        let constructor_ref = object::create_object(admin_addr, false);
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        let vault_addr = object::address_from_constructor_ref(&constructor_ref);

        move_to(admin, LotteryConfig {
            admin: admin_addr,
            current_draw_id: 1,
            ticket_price: TICKET_PRICE,
            total_tickets_sold: 0,
            extend_ref,
            vault_addr,
        });

        let draws = table::new<u64, Draw>();
        let draw_tickets = table::new<u64, vector<TicketEntry>>();

        let first_draw = new_draw(1, current_time);
        table::add(&mut draws, 1, first_draw);
        table::add(&mut draw_tickets, 1, vector::empty<TicketEntry>());

        move_to(admin, DrawStore { draws, draw_tickets });
    }

    fun new_draw(id: u64, current_time: u64): Draw {
        Draw {
            id,
            start_time: current_time,
            end_time: current_time + DRAW_DURATION,
            total_prize_pool: 0,
            total_claimed: 0,
            winning_numbers: vector::empty(),
            bonus_number: 0,
            is_drawn: false,
            prizes_distributed: false,
            claim_deadline: 0,
            rollover_amount: 0,
            is_expired: false,
            prize_per_winner: vector::empty(),
            is_finalized: false,
        }
    }

    public entry fun buy_ticket(
        buyer: &signer,
        numbers: vector<u8>,
    ) acquires LotteryConfig, DrawStore, TicketCollection {
        let buyer_addr = signer::address_of(buyer);
        assert!(vector::length(&numbers) == NUMBERS_TO_PICK, error::invalid_argument(EINVALID_NUMBERS));
        validate_numbers(&numbers);

        let config = borrow_global_mut<LotteryConfig>(@lottery);
        let draw_store = borrow_global_mut<DrawStore>(@lottery);

        let metadata = object::address_to_object<Metadata>(@0x9759eac00e068b4e8adc206d17c6a8477f00ae41f824f0e2e81b3832cc8065ae);
        primary_fungible_store::transfer(buyer, metadata, config.vault_addr, config.ticket_price);

        let (_, current_time) = block::get_block_info();
        let draw_id = config.current_draw_id;

        let ticket = Ticket {
            draw_id,
            owner: buyer_addr,
            numbers: copy numbers,
            timestamp: current_time,
            claimed: false,
        };
        if (!exists<TicketCollection>(buyer_addr)) {
            move_to(buyer, TicketCollection { tickets: vector::empty() });
        };
        let collection = borrow_global_mut<TicketCollection>(buyer_addr);
        vector::push_back(&mut collection.tickets, ticket);

        let ticket_entry = TicketEntry { owner: buyer_addr, numbers };
        let draw_ticket_list = table::borrow_mut(&mut draw_store.draw_tickets, draw_id);
        vector::push_back(draw_ticket_list, ticket_entry);

        config.total_tickets_sold = config.total_tickets_sold + 1;
        let current_draw = table::borrow_mut(&mut draw_store.draws, draw_id);
        current_draw.total_prize_pool = current_draw.total_prize_pool + config.ticket_price;
    }

    public entry fun execute_draw(admin: &signer, draw_id: u64) acquires LotteryConfig, DrawStore {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global<LotteryConfig>(@lottery);
        assert!(admin_addr == config.admin, error::permission_denied(ENOT_ADMIN));

        let draw_store = borrow_global_mut<DrawStore>(@lottery);
        assert!(table::contains(&draw_store.draws, draw_id), error::not_found(EDRAW_NOT_FOUND));

        let draw = table::borrow_mut(&mut draw_store.draws, draw_id);
        assert!(!draw.is_drawn, error::already_exists(EALREADY_CLAIMED));

        let (_, current_time) = block::get_block_info();
        let winning_numbers = lottery_random::generate_random_numbers();
        let bonus_number = lottery_random::generate_bonus_number(&winning_numbers);

        draw.winning_numbers = winning_numbers;
        draw.bonus_number = bonus_number;
        draw.is_drawn = true;
        draw.claim_deadline = current_time + CLAIM_DURATION;
    }

    public entry fun finalize_draw(admin: &signer, draw_id: u64) acquires LotteryConfig, DrawStore {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global<LotteryConfig>(@lottery);
        assert!(admin_addr == config.admin, error::permission_denied(ENOT_ADMIN));

        let draw_store = borrow_global_mut<DrawStore>(@lottery);
        assert!(table::contains(&draw_store.draws, draw_id), error::not_found(EDRAW_NOT_FOUND));

        let draw = table::borrow(&draw_store.draws, draw_id);
        assert!(draw.is_drawn, error::invalid_state(EDRAW_NOT_COMPLETE));
        assert!(!draw.is_finalized, error::already_exists(EALREADY_FINALIZED));

        let winning_numbers = draw.winning_numbers;
        let prize_pool = draw.total_prize_pool;

        let winner_counts = vector[0u64, 0u64, 0u64, 0u64, 0u64];

        let tickets = table::borrow(&draw_store.draw_tickets, draw_id);
        let len = vector::length(tickets);
        let i = 0;
        while (i < len) {
            let entry = vector::borrow(tickets, i);
            let matches = count_matches(&entry.numbers, &winning_numbers);
            if (matches >= 2) {
                let tier_index = (matches - 2) as u64;
                let count = vector::borrow_mut(&mut winner_counts, tier_index);
                *count = *count + 1;
            };
            i = i + 1;
        };

        let tier_percents = vector[PRIZE_TIER_2, PRIZE_TIER_3, PRIZE_TIER_4, PRIZE_TIER_5, PRIZE_TIER_6];
        let prize_per_winner = vector::empty<u64>();
        let j = 0;
        while (j < 5) {
            let count = *vector::borrow(&winner_counts, j);
            let percent = *vector::borrow(&tier_percents, j);
            let tier_total = prize_pool * percent / 100;
            let per_winner = if (count > 0) { tier_total / count } else { 0 };
            vector::push_back(&mut prize_per_winner, per_winner);
            j = j + 1;
        };

        let draw_mut = table::borrow_mut(&mut draw_store.draws, draw_id);
        draw_mut.prize_per_winner = prize_per_winner;
        draw_mut.is_finalized = true;
    }

    public entry fun force_new_draw(admin: &signer) acquires LotteryConfig, DrawStore {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global_mut<LotteryConfig>(@lottery);
        assert!(admin_addr == config.admin, error::permission_denied(ENOT_ADMIN));

        let draw_store = borrow_global_mut<DrawStore>(@lottery);
        let (_, current_time) = block::get_block_info();

        let current_draw = table::borrow_mut(&mut draw_store.draws, config.current_draw_id);
        if (!current_draw.is_drawn) {
            let winning_numbers = lottery_random::generate_random_numbers();
            let bonus_number = lottery_random::generate_bonus_number(&winning_numbers);
            current_draw.winning_numbers = winning_numbers;
            current_draw.bonus_number = bonus_number;
            current_draw.is_drawn = true;
            current_draw.claim_deadline = current_time + CLAIM_DURATION;
        };

        let new_draw_id = config.current_draw_id + 1;
        let new_draw = new_draw(new_draw_id, current_time);
        table::add(&mut draw_store.draws, new_draw_id, new_draw);
        table::add(&mut draw_store.draw_tickets, new_draw_id, vector::empty<TicketEntry>());
        config.current_draw_id = new_draw_id;
    }

    public entry fun expire_claims(admin: &signer, expired_draw_id: u64) acquires LotteryConfig, DrawStore {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global<LotteryConfig>(@lottery);
        assert!(admin_addr == config.admin, error::permission_denied(ENOT_ADMIN));

        let draw_store = borrow_global_mut<DrawStore>(@lottery);
        assert!(table::contains(&draw_store.draws, expired_draw_id), error::not_found(EDRAW_NOT_FOUND));

        let (_, current_time) = block::get_block_info();
        let expired_draw = table::borrow_mut(&mut draw_store.draws, expired_draw_id);
        assert!(expired_draw.is_drawn, error::invalid_state(EDRAW_NOT_COMPLETE));
        assert!(!expired_draw.is_expired, error::already_exists(EALREADY_EXPIRED));
        assert!(current_time >= expired_draw.claim_deadline, error::invalid_state(ECLAIMS_NOT_EXPIRED));

        let unclaimed = if (expired_draw.total_prize_pool > expired_draw.total_claimed) {
            expired_draw.total_prize_pool - expired_draw.total_claimed
        } else {
            0
        };

        expired_draw.rollover_amount = unclaimed;
        expired_draw.is_expired = true;

        if (unclaimed > 0) {
            let active_draw_id = config.current_draw_id;
            if (active_draw_id != expired_draw_id) {
                let active_draw = table::borrow_mut(&mut draw_store.draws, active_draw_id);
                active_draw.total_prize_pool = active_draw.total_prize_pool + unclaimed;
            };
        };
    }

    public entry fun claim_prize(
        claimer: &signer,
        draw_id: u64,
    ) acquires LotteryConfig, DrawStore, TicketCollection {
        let claimer_addr = signer::address_of(claimer);

        let draw_store = borrow_global_mut<DrawStore>(@lottery);
        assert!(table::contains(&draw_store.draws, draw_id), error::not_found(EDRAW_NOT_FOUND));

        let draw = table::borrow(&draw_store.draws, draw_id);
        assert!(draw.is_drawn, error::invalid_state(EDRAW_NOT_COMPLETE));
        assert!(draw.is_finalized, error::invalid_state(ENOT_FINALIZED));

        let (_, current_time) = block::get_block_info();
        assert!(current_time <= draw.claim_deadline, error::invalid_state(ECLAIM_DEADLINE_PASSED));

        let winning_numbers = draw.winning_numbers;
        let prize_per_winner = draw.prize_per_winner;

        assert!(exists<TicketCollection>(claimer_addr), error::not_found(ENO_PRIZE));
        let collection = borrow_global_mut<TicketCollection>(claimer_addr);

        let total_prize = 0u64;
        let len = vector::length(&collection.tickets);
        let i = 0;
        while (i < len) {
            let ticket = vector::borrow_mut(&mut collection.tickets, i);
            if (ticket.draw_id == draw_id && !ticket.claimed) {
                let matches = count_matches(&ticket.numbers, &winning_numbers);
                if (matches >= 2) {
                    let tier_index = (matches - 2) as u64;
                    let prize = *vector::borrow(&prize_per_winner, tier_index);
                    total_prize = total_prize + prize;
                };
                ticket.claimed = true;
            };
            i = i + 1;
        };

        assert!(total_prize > 0, error::invalid_state(ENO_PRIZE));

        let config = borrow_global<LotteryConfig>(@lottery);
        let lottery_signer = object::generate_signer_for_extending(&config.extend_ref);
        let metadata = object::address_to_object<Metadata>(@0x9759eac00e068b4e8adc206d17c6a8477f00ae41f824f0e2e81b3832cc8065ae);
        let fa = primary_fungible_store::withdraw(&lottery_signer, metadata, total_prize);
        primary_fungible_store::deposit(claimer_addr, fa);

        let draw_mut = table::borrow_mut(&mut draw_store.draws, draw_id);
        draw_mut.total_claimed = draw_mut.total_claimed + total_prize;
    }

    public fun count_matches(ticket_numbers: &vector<u8>, winning_numbers: &vector<u8>): u8 {
        let matches = 0u8;
        let i = 0;
        let len = vector::length(ticket_numbers);
        while (i < len) {
            let num = *vector::borrow(ticket_numbers, i);
            if (vector::contains(winning_numbers, &num)) {
                matches = matches + 1;
            };
            i = i + 1;
        };
        matches
    }

    fun validate_numbers(numbers: &vector<u8>) {
        let i = 0;
        let len = vector::length(numbers);
        while (i < len) {
            let num = *vector::borrow(numbers, i);
            assert!(num >= MIN_NUMBER && num <= MAX_NUMBER, error::invalid_argument(ENUMBER_OUT_OF_RANGE));
            let j = i + 1;
            while (j < len) {
                assert!(*vector::borrow(numbers, j) != num, error::invalid_argument(EDUPLICATE_NUMBERS));
                j = j + 1;
            };
            i = i + 1;
        };
    }

    #[view] public fun get_ticket_price(): u64 { TICKET_PRICE }
    #[view] public fun get_draw_duration(): u64 { DRAW_DURATION }
    #[view] public fun get_claim_duration(): u64 { CLAIM_DURATION }

    #[view]
    public fun get_current_draw_id(config_addr: address): u64 acquires LotteryConfig {
        borrow_global<LotteryConfig>(config_addr).current_draw_id
    }

    #[view]
    public fun get_draw_info(config_addr: address, draw_id: u64): (u64, u64, u64, bool, u64, bool, bool) acquires DrawStore {
        let draw = table::borrow(&borrow_global<DrawStore>(config_addr).draws, draw_id);
        (draw.start_time, draw.end_time, draw.total_prize_pool, draw.is_drawn, draw.claim_deadline, draw.is_finalized, draw.is_expired)
    }

    #[view]
    public fun get_prize_per_winner(config_addr: address, draw_id: u64): vector<u64> acquires DrawStore {
        table::borrow(&borrow_global<DrawStore>(config_addr).draws, draw_id).prize_per_winner
    }

    #[view]
    public fun get_winning_numbers(config_addr: address, draw_id: u64): vector<u8> acquires DrawStore {
        table::borrow(&borrow_global<DrawStore>(config_addr).draws, draw_id).winning_numbers
    }

    #[view]
    public fun get_current_prize_pool(config_addr: address): u64 acquires LotteryConfig, DrawStore {
        let config = borrow_global<LotteryConfig>(config_addr);
        let draw_store = borrow_global<DrawStore>(config_addr);
        table::borrow(&draw_store.draws, config.current_draw_id).total_prize_pool
    }

    #[view]
    public fun get_time_remaining(config_addr: address): u64 acquires LotteryConfig, DrawStore {
        let config = borrow_global<LotteryConfig>(config_addr);
        let draw_store = borrow_global<DrawStore>(config_addr);
        let draw = table::borrow(&draw_store.draws, config.current_draw_id);
        let (_, current_time) = block::get_block_info();
        if (current_time >= draw.end_time) { 0 } else { draw.end_time - current_time }
    }

    #[view]
    public fun get_claim_time_remaining(config_addr: address, draw_id: u64): u64 acquires DrawStore {
        let draw = table::borrow(&borrow_global<DrawStore>(config_addr).draws, draw_id);
        if (draw.claim_deadline == 0) { return 0 };
        let (_, current_time) = block::get_block_info();
        if (current_time >= draw.claim_deadline) { 0 } else { draw.claim_deadline - current_time }
    }

    #[view]
    public fun get_rollover_amount(config_addr: address, draw_id: u64): u64 acquires DrawStore {
        table::borrow(&borrow_global<DrawStore>(config_addr).draws, draw_id).rollover_amount
    }

    #[view]
    public fun get_total_tickets_sold(config_addr: address): u64 acquires LotteryConfig {
        borrow_global<LotteryConfig>(config_addr).total_tickets_sold
    }

    #[view]
    public fun get_draw_ticket_count(config_addr: address, draw_id: u64): u64 acquires DrawStore {
        let draw_store = borrow_global<DrawStore>(config_addr);
        if (!table::contains(&draw_store.draw_tickets, draw_id)) { return 0 };
        vector::length(table::borrow(&draw_store.draw_tickets, draw_id))
    }

    #[view]
    public fun get_user_tickets_for_draw(user_addr: address, draw_id: u64): vector<vector<u8>> acquires TicketCollection {
        if (!exists<TicketCollection>(user_addr)) { return vector::empty<vector<u8>>() };
        let collection = borrow_global<TicketCollection>(user_addr);
        let result = vector::empty<vector<u8>>();
        let len = vector::length(&collection.tickets);
        let i = 0;
        while (i < len) {
            let ticket = vector::borrow(&collection.tickets, i);
            if (ticket.draw_id == draw_id) {
                vector::push_back(&mut result, ticket.numbers);
            };
            i = i + 1;
        };
        result
    }

    #[view]
    public fun get_claimable_prize(user_addr: address, draw_id: u64): u64 acquires DrawStore, TicketCollection {
        if (!exists<TicketCollection>(user_addr)) { return 0 };
        let draw_store = borrow_global<DrawStore>(@lottery);
        if (!table::contains(&draw_store.draws, draw_id)) { return 0 };
        let draw = table::borrow(&draw_store.draws, draw_id);
        if (!draw.is_drawn || !draw.is_finalized) { return 0 };
        let (_, current_time) = block::get_block_info();
        if (current_time > draw.claim_deadline) { return 0 };
        let winning_numbers = &draw.winning_numbers;
        let prize_per_winner = &draw.prize_per_winner;
        let collection = borrow_global<TicketCollection>(user_addr);
        let total = 0u64;
        let len = vector::length(&collection.tickets);
        let i = 0;
        while (i < len) {
            let ticket = vector::borrow(&collection.tickets, i);
            if (ticket.draw_id == draw_id && !ticket.claimed) {
                let matches = count_matches(&ticket.numbers, winning_numbers);
                if (matches >= 2) {
                    let tier_index = (matches - 2) as u64;
                    total = total + *vector::borrow(prize_per_winner, tier_index);
                };
            };
            i = i + 1;
        };
        total
    }

    public entry fun update_ticket_price(admin: &signer, new_price: u64) acquires LotteryConfig {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global_mut<LotteryConfig>(@lottery);
        assert!(config.admin == admin_addr, error::permission_denied(ENOT_ADMIN));
        config.ticket_price = new_price;
    }

    #[test_only]
    public entry fun buy_ticket_for_testing(buyer: &signer, numbers: vector<u8>) acquires LotteryConfig, DrawStore, TicketCollection {
        let buyer_addr = signer::address_of(buyer);
        assert!(vector::length(&numbers) == NUMBERS_TO_PICK, error::invalid_argument(EINVALID_NUMBERS));
        validate_numbers(&numbers);
        let config = borrow_global_mut<LotteryConfig>(@lottery);
        let draw_store = borrow_global_mut<DrawStore>(@lottery);
        let (_, current_time) = block::get_block_info();
        let draw_id = config.current_draw_id;
        let ticket = Ticket {
            draw_id,
            owner: buyer_addr,
            numbers: copy numbers,
            timestamp: current_time,
            claimed: false,
        };
        if (!exists<TicketCollection>(buyer_addr)) {
            move_to(buyer, TicketCollection { tickets: vector::empty() });
        };
        let collection = borrow_global_mut<TicketCollection>(buyer_addr);
        vector::push_back(&mut collection.tickets, ticket);
        let ticket_entry = TicketEntry { owner: buyer_addr, numbers };
        let draw_ticket_list = table::borrow_mut(&mut draw_store.draw_tickets, draw_id);
        vector::push_back(draw_ticket_list, ticket_entry);
        config.total_tickets_sold = config.total_tickets_sold + 1;
        let current_draw = table::borrow_mut(&mut draw_store.draws, draw_id);
        current_draw.total_prize_pool = current_draw.total_prize_pool + config.ticket_price;
    }

    #[test_only]
    public fun init_for_testing(admin: &signer) { initialize(admin); }
}
