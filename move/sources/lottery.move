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

    const MIN_NUMBER: u8 = 1;
    const MAX_NUMBER: u8 = 20;
    const NUMBERS_TO_PICK: u64 = 6;
    const TICKET_PRICE: u64 = 5000000;
    const DRAW_DURATION: u64 = 86400;

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
    }

    struct Ticket has store, drop {
        draw_id: u64,
        owner: address,
        numbers: vector<u8>,
        timestamp: u64,
        matches: u8,
        prize_amount: u64,
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
        let first_draw = Draw {
            id: 1,
            start_time: current_time,
            end_time: current_time + DRAW_DURATION,
            total_prize_pool: 0,
            total_claimed: 0,
            winning_numbers: vector::empty(),
            bonus_number: 0,
            is_drawn: false,
            prizes_distributed: false,
        };
        table::add(&mut draws, 1, first_draw);
        move_to(admin, DrawStore { draws });
    }

    fun check_and_rotate_draw(config: &mut LotteryConfig, draw_store: &mut DrawStore) {
        let (_, current_time) = block::get_block_info();
        let current_draw = table::borrow(&draw_store.draws, config.current_draw_id);
        if (current_time >= current_draw.end_time && !current_draw.is_drawn) {
            let draw_mut = table::borrow_mut(&mut draw_store.draws, config.current_draw_id);
            let winning_numbers = lottery_random::generate_random_numbers();
            let bonus_number = lottery_random::generate_bonus_number(&winning_numbers);
            draw_mut.winning_numbers = winning_numbers;
            draw_mut.bonus_number = bonus_number;
            draw_mut.is_drawn = true;
            let rollover_amount = if (draw_mut.total_prize_pool > draw_mut.total_claimed) {
                draw_mut.total_prize_pool - draw_mut.total_claimed
            } else {
                0
            };
            let new_draw_id = config.current_draw_id + 1;
            let new_draw = Draw {
                id: new_draw_id,
                start_time: current_time,
                end_time: current_time + DRAW_DURATION,
                total_prize_pool: rollover_amount,
                total_claimed: 0,
                winning_numbers: vector::empty(),
                bonus_number: 0,
                is_drawn: false,
                prizes_distributed: false,
            };
            table::add(&mut draw_store.draws, new_draw_id, new_draw);
            config.current_draw_id = new_draw_id;
        };
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
        check_and_rotate_draw(config, draw_store);

        let metadata = object::address_to_object<Metadata>(@0x9759eac00e068b4e8adc206d17c6a8477f00ae41f824f0e2e81b3832cc8065ae);
        // Send to vault_addr (the object address) instead of @lottery
        primary_fungible_store::transfer(buyer, metadata, config.vault_addr, config.ticket_price);

        let (_, current_time) = block::get_block_info();
        let ticket = Ticket {
            draw_id: config.current_draw_id,
            owner: buyer_addr,
            numbers,
            timestamp: current_time,
            matches: 0,
            prize_amount: 0,
            claimed: false,
        };

        if (!exists<TicketCollection>(buyer_addr)) {
            move_to(buyer, TicketCollection { tickets: vector::empty() });
        };

        let collection = borrow_global_mut<TicketCollection>(buyer_addr);
        vector::push_back(&mut collection.tickets, ticket);
        config.total_tickets_sold = config.total_tickets_sold + 1;
        let current_draw = table::borrow_mut(&mut draw_store.draws, config.current_draw_id);
        current_draw.total_prize_pool = current_draw.total_prize_pool + config.ticket_price;
    }

    fun calculate_prize(matches: u8, pool: u64): u64 {
        if (matches == 6) { pool * PRIZE_TIER_6 / 100 }
        else if (matches == 5) { pool * PRIZE_TIER_5 / 100 }
        else if (matches == 4) { pool * PRIZE_TIER_4 / 100 }
        else if (matches == 3) { pool * PRIZE_TIER_3 / 100 }
        else if (matches == 2) { pool * PRIZE_TIER_2 / 100 }
        else { 0 }
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

        let winning_numbers = draw.winning_numbers;
        let prize_pool = draw.total_prize_pool;

        assert!(exists<TicketCollection>(claimer_addr), error::not_found(ENO_PRIZE));
        let collection = borrow_global_mut<TicketCollection>(claimer_addr);

        let total_prize = 0u64;
        let len = vector::length(&collection.tickets);
        let i = 0;
        while (i < len) {
            let ticket = vector::borrow_mut(&mut collection.tickets, i);
            if (ticket.draw_id == draw_id && !ticket.claimed) {
                let matches = count_matches(&ticket.numbers, &winning_numbers);
                let prize = calculate_prize(matches, prize_pool);
                ticket.matches = matches;
                ticket.prize_amount = prize;
                ticket.claimed = true;
                total_prize = total_prize + prize;
            };
            i = i + 1;
        };

        assert!(total_prize > 0, error::invalid_state(ENO_PRIZE));

        let config = borrow_global<LotteryConfig>(@lottery);
        let lottery_signer = object::generate_signer_for_extending(&config.extend_ref);
        let metadata = object::address_to_object<Metadata>(@0x9759eac00e068b4e8adc206d17c6a8477f00ae41f824f0e2e81b3832cc8065ae);
        let fa = primary_fungible_store::withdraw(&lottery_signer, metadata, total_prize);
        primary_fungible_store::deposit(claimer_addr, fa);

        // Update total_claimed for this draw
        let draw_mut = table::borrow_mut(&mut draw_store.draws, draw_id);
        draw_mut.total_claimed = draw_mut.total_claimed + total_prize;
    }

    #[view]
    public fun get_claimable_prize(user_addr: address, draw_id: u64): u64 acquires DrawStore, TicketCollection {
        if (!exists<TicketCollection>(user_addr)) { return 0 };
        let draw_store = borrow_global<DrawStore>(@lottery);
        if (!table::contains(&draw_store.draws, draw_id)) { return 0 };
        let draw = table::borrow(&draw_store.draws, draw_id);
        if (!draw.is_drawn) { return 0 };
        let winning_numbers = &draw.winning_numbers;
        let prize_pool = draw.total_prize_pool;
        let collection = borrow_global<TicketCollection>(user_addr);
        let total = 0u64;
        let len = vector::length(&collection.tickets);
        let i = 0;
        while (i < len) {
            let ticket = vector::borrow(&collection.tickets, i);
            if (ticket.draw_id == draw_id && !ticket.claimed) {
                let matches = count_matches(&ticket.numbers, winning_numbers);
                total = total + calculate_prize(matches, prize_pool);
            };
            i = i + 1;
        };
        total
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

    public entry fun execute_draw(admin: &signer, draw_id: u64) acquires LotteryConfig, DrawStore {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global<LotteryConfig>(@lottery);
        assert!(admin_addr == config.admin, error::permission_denied(ENOT_ADMIN));
        let draw_store = borrow_global_mut<DrawStore>(@lottery);
        assert!(table::contains(&draw_store.draws, draw_id), error::not_found(EDRAW_NOT_FOUND));
        let draw = table::borrow_mut(&mut draw_store.draws, draw_id);
        assert!(!draw.is_drawn, error::already_exists(EALREADY_CLAIMED));
        let winning_numbers = lottery_random::generate_random_numbers();
        let bonus_number = lottery_random::generate_bonus_number(&winning_numbers);
        draw.winning_numbers = winning_numbers;
        draw.bonus_number = bonus_number;
        draw.is_drawn = true;
    }

    public entry fun force_new_draw(admin: &signer) acquires LotteryConfig, DrawStore {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global_mut<LotteryConfig>(@lottery);
        assert!(admin_addr == config.admin, error::permission_denied(ENOT_ADMIN));
        let draw_store = borrow_global_mut<DrawStore>(@lottery);
        let (_, current_time) = block::get_block_info();
        let current_draw = table::borrow_mut(&mut draw_store.draws, config.current_draw_id);
        let rollover_amount = if (current_draw.total_prize_pool > current_draw.total_claimed) {
            current_draw.total_prize_pool - current_draw.total_claimed
        } else {
            0
        };
        if (!current_draw.is_drawn) {
            let winning_numbers = lottery_random::generate_random_numbers();
            let bonus_number = lottery_random::generate_bonus_number(&winning_numbers);
            current_draw.winning_numbers = winning_numbers;
            current_draw.bonus_number = bonus_number;
            current_draw.is_drawn = true;
        };
        let new_draw_id = config.current_draw_id + 1;
        let new_draw = Draw {
            id: new_draw_id,
            start_time: current_time,
            end_time: current_time + DRAW_DURATION,
            total_prize_pool: rollover_amount,
            total_claimed: 0,
            winning_numbers: vector::empty(),
            bonus_number: 0,
            is_drawn: false,
            prizes_distributed: false,
        };
        table::add(&mut draw_store.draws, new_draw_id, new_draw);
        config.current_draw_id = new_draw_id;
    }

    public fun count_matches(ticket_numbers: &vector<u8>, winning_numbers: &vector<u8>): u8 {
        let matches = 0u8;
        let i = 0;
        let ticket_len = vector::length(ticket_numbers);
        while (i < ticket_len) {
            let ticket_num = *vector::borrow(ticket_numbers, i);
            if (vector::contains(winning_numbers, &ticket_num)) {
                matches = matches + 1;
            };
            i = i + 1;
        };
        matches
    }

    #[view] public fun get_ticket_price(): u64 { TICKET_PRICE }
    #[view] public fun get_draw_duration(): u64 { DRAW_DURATION }

    #[view]
    public fun get_current_draw_id(config_addr: address): u64 acquires LotteryConfig {
        borrow_global<LotteryConfig>(config_addr).current_draw_id
    }

    #[view]
    public fun get_total_tickets_sold(config_addr: address): u64 acquires LotteryConfig {
        borrow_global<LotteryConfig>(config_addr).total_tickets_sold
    }

    #[view]
    public fun get_draw_info(config_addr: address, draw_id: u64): (u64, u64, u64, bool) acquires DrawStore {
        let draw = table::borrow(&borrow_global<DrawStore>(config_addr).draws, draw_id);
        (draw.start_time, draw.end_time, draw.total_prize_pool, draw.is_drawn)
    }

    #[view]
    public fun get_current_prize_pool(config_addr: address): u64 acquires LotteryConfig, DrawStore {
        let config = borrow_global<LotteryConfig>(config_addr);
        let draw_store = borrow_global<DrawStore>(config_addr);
        let draw = table::borrow(&draw_store.draws, config.current_draw_id);
        if (draw.total_prize_pool > draw.total_claimed) {
            draw.total_prize_pool - draw.total_claimed
        } else {
            0
        }
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
    public fun is_draw_complete(config_addr: address, draw_id: u64): bool acquires DrawStore {
        table::borrow(&borrow_global<DrawStore>(config_addr).draws, draw_id).is_drawn
    }

    #[view]
    public fun get_winning_numbers(config_addr: address, draw_id: u64): vector<u8> acquires DrawStore {
        table::borrow(&borrow_global<DrawStore>(config_addr).draws, draw_id).winning_numbers
    }

    #[view]
    public fun get_user_ticket_count(user_addr: address): u64 acquires TicketCollection {
        if (!exists<TicketCollection>(user_addr)) { return 0 };
        vector::length(&borrow_global<TicketCollection>(user_addr).tickets)
    }

    #[view]
    public fun get_user_tickets(user_addr: address): vector<vector<u8>> acquires TicketCollection {
        if (!exists<TicketCollection>(user_addr)) { return vector::empty<vector<u8>>() };
        let collection = borrow_global<TicketCollection>(user_addr);
        let result = vector::empty<vector<u8>>();
        let len = vector::length(&collection.tickets);
        let i = 0;
        while (i < len) {
            vector::push_back(&mut result, vector::borrow(&collection.tickets, i).numbers);
            i = i + 1;
        };
        result
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
        let ticket = Ticket {
            draw_id: config.current_draw_id,
            owner: buyer_addr,
            numbers,
            timestamp: current_time,
            matches: 0,
            prize_amount: 0,
            claimed: false,
        };
        if (!exists<TicketCollection>(buyer_addr)) {
            move_to(buyer, TicketCollection { tickets: vector::empty() });
        };
        let collection = borrow_global_mut<TicketCollection>(buyer_addr);
        vector::push_back(&mut collection.tickets, ticket);
        config.total_tickets_sold = config.total_tickets_sold + 1;
        let current_draw = table::borrow_mut(&mut draw_store.draws, config.current_draw_id);
        current_draw.total_prize_pool = current_draw.total_prize_pool + config.ticket_price;
    }

    #[test_only]
    public fun init_for_testing(admin: &signer) { initialize(admin); }
}
