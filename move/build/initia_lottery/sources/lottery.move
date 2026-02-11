module lottery::lottery {
    use std::signer;
    use std::vector;
    use std::error;

    /// Error codes
    const ENOT_ADMIN: u64 = 1;
    const EINVALID_NUMBERS: u64 = 2;
    const EDUPLICATE_NUMBERS: u64 = 3;
    const ENUMBER_OUT_OF_RANGE: u64 = 4;
    const EINSUFFICIENT_PAYMENT: u64 = 5;
    const ELOTTERY_NOT_INITIALIZED: u64 = 6;

    /// Constants
    const MIN_NUMBER: u8 = 1;
    const MAX_NUMBER: u8 = 45;
    const NUMBERS_TO_PICK: u64 = 6;
    const TICKET_PRICE: u64 = 1000; // 1000 units

    /// Lottery configuration and state
    struct LotteryConfig has key {
        admin: address,
        current_draw_id: u64,
        ticket_price: u64,
        total_tickets_sold: u64,
    }

    /// Represents a single draw
    struct Draw has key, store {
        id: u64,
        start_time: u64,
        end_time: u64,
        total_prize_pool: u64,
        winning_numbers: vector<u8>,
        bonus_number: u8,
        is_drawn: bool,
    }

    /// Represents a ticket purchase
    struct Ticket has store, drop {
        draw_id: u64,
        owner: address,
        numbers: vector<u8>,
        timestamp: u64,
    }

    /// User's ticket collection
    struct TicketCollection has key {
        tickets: vector<Ticket>,
    }

    /// Initialize the lottery system
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        
        assert!(!exists<LotteryConfig>(admin_addr), error::already_exists(ELOTTERY_NOT_INITIALIZED));

        move_to(admin, LotteryConfig {
            admin: admin_addr,
            current_draw_id: 1,
            ticket_price: TICKET_PRICE,
            total_tickets_sold: 0,
        });

        // Initialize first draw
        move_to(admin, Draw {
            id: 1,
            start_time: 0, // Will be set properly later
            end_time: 0,
            total_prize_pool: 0,
            winning_numbers: vector::empty(),
            bonus_number: 0,
            is_drawn: false,
        });
    }

    /// Buy a lottery ticket
    public entry fun buy_ticket(
        buyer: &signer,
        numbers: vector<u8>,
    ) acquires LotteryConfig, Draw, TicketCollection {
        let buyer_addr = signer::address_of(buyer);

        // Validate numbers
        assert!(vector::length(&numbers) == NUMBERS_TO_PICK, error::invalid_argument(EINVALID_NUMBERS));
        validate_numbers(&numbers);

        // Get current draw
        let config = borrow_global_mut<LotteryConfig>(@lottery);
        let draw = borrow_global_mut<Draw>(@lottery);

        // Create ticket
        let ticket = Ticket {
            draw_id: config.current_draw_id,
            owner: buyer_addr,
            numbers,
            timestamp: 0, // Will use proper timestamp later
        };

        // Add ticket to user's collection
        if (!exists<TicketCollection>(buyer_addr)) {
            move_to(buyer, TicketCollection {
                tickets: vector::empty(),
            });
        };

        let collection = borrow_global_mut<TicketCollection>(buyer_addr);
        vector::push_back(&mut collection.tickets, ticket);

        // Update stats
        config.total_tickets_sold = config.total_tickets_sold + 1;
        draw.total_prize_pool = draw.total_prize_pool + config.ticket_price;
    }

    /// Validate that numbers are in range and not duplicated
    fun validate_numbers(numbers: &vector<u8>) {
        let i = 0;
        let len = vector::length(numbers);

        while (i < len) {
            let num = *vector::borrow(numbers, i);
            
            // Check range
            assert!(num >= MIN_NUMBER && num <= MAX_NUMBER, error::invalid_argument(ENUMBER_OUT_OF_RANGE));
            
            // Check for duplicates
            let j = i + 1;
            while (j < len) {
                assert!(*vector::borrow(numbers, j) != num, error::invalid_argument(EDUPLICATE_NUMBERS));
                j = j + 1;
            };
            
            i = i + 1;
        };
    }

    /// Execute draw (will integrate VRF later)
    public entry fun execute_draw(
        admin: &signer,
        winning_numbers: vector<u8>,
        bonus_number: u8,
    ) acquires LotteryConfig, Draw {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global<LotteryConfig>(@lottery);
        
        assert!(admin_addr == config.admin, error::permission_denied(ENOT_ADMIN));

        // Validate winning numbers
        assert!(vector::length(&winning_numbers) == NUMBERS_TO_PICK, error::invalid_argument(EINVALID_NUMBERS));
        validate_numbers(&winning_numbers);
        assert!(bonus_number >= MIN_NUMBER && bonus_number <= MAX_NUMBER, error::invalid_argument(ENUMBER_OUT_OF_RANGE));

        let draw = borrow_global_mut<Draw>(@lottery);
        draw.winning_numbers = winning_numbers;
        draw.bonus_number = bonus_number;
        draw.is_drawn = true;
    }

    /// Calculate how many numbers match
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

    /// Check if user has bonus number
    public fun has_bonus_number(ticket_numbers: &vector<u8>, bonus_number: u8): bool {
        vector::contains(ticket_numbers, &bonus_number)
    }

    // View functions

    #[view]
    public fun get_ticket_price(): u64 {
        TICKET_PRICE
    }

    #[view]
    public fun get_current_draw_id(config_addr: address): u64 acquires LotteryConfig {
        let config = borrow_global<LotteryConfig>(config_addr);
        config.current_draw_id
    }

    #[view]
    public fun get_total_tickets_sold(config_addr: address): u64 acquires LotteryConfig {
        let config = borrow_global<LotteryConfig>(config_addr);
        config.total_tickets_sold
    }

    #[view]
    public fun get_prize_pool(draw_addr: address): u64 acquires Draw {
        let draw = borrow_global<Draw>(draw_addr);
        draw.total_prize_pool
    }

    #[view]
    public fun is_draw_complete(draw_addr: address): bool acquires Draw {
        let draw = borrow_global<Draw>(draw_addr);
        draw.is_drawn
    }

    #[view]
    public fun get_winning_numbers(draw_addr: address): vector<u8> acquires Draw {
        let draw = borrow_global<Draw>(draw_addr);
        draw.winning_numbers
    }

    #[view]
    public fun get_user_ticket_count(user_addr: address): u64 acquires TicketCollection {
        if (!exists<TicketCollection>(user_addr)) {
            return 0
        };
        let collection = borrow_global<TicketCollection>(user_addr);
        vector::length(&collection.tickets)
    }

    #[test_only]
    public fun init_for_testing(admin: &signer) {
        initialize(admin);
    }
}