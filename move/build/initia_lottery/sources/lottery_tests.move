module lottery::lottery_tests {
    use std::signer;
    use std::vector;
    use lottery::lottery;

    #[test(admin = @lottery)]
    fun test_initialize(admin: &signer) {
        lottery::init_for_testing(admin);
        
        let admin_addr = signer::address_of(admin);
        assert!(lottery::get_current_draw_id(admin_addr) == 1, 0);
        assert!(lottery::get_total_tickets_sold(admin_addr) == 0, 1);
    }

    #[test(admin = @lottery, buyer = @0x123)]
    fun test_buy_ticket(admin: &signer, buyer: &signer) {
        lottery::init_for_testing(admin);

        let numbers = vector::empty<u8>();
        vector::push_back(&mut numbers, 1);
        vector::push_back(&mut numbers, 2);
        vector::push_back(&mut numbers, 3);
        vector::push_back(&mut numbers, 4);
        vector::push_back(&mut numbers, 5);
        vector::push_back(&mut numbers, 6);

        lottery::buy_ticket(buyer, numbers);

        let buyer_addr = signer::address_of(buyer);
        assert!(lottery::get_user_ticket_count(buyer_addr) == 1, 0);
    }

    #[test(admin = @lottery)]
    #[expected_failure(abort_code = 0x10002)]
    fun test_buy_ticket_wrong_count(admin: &signer) {
        lottery::init_for_testing(admin);

        let numbers = vector::empty<u8>();
        vector::push_back(&mut numbers, 1);
        vector::push_back(&mut numbers, 2);
        vector::push_back(&mut numbers, 3);

        lottery::buy_ticket(admin, numbers);
    }

    #[test(admin = @lottery)]
    #[expected_failure(abort_code = 0x10003)]
    fun test_buy_ticket_duplicate_numbers(admin: &signer) {
        lottery::init_for_testing(admin);

        let numbers = vector::empty<u8>();
        vector::push_back(&mut numbers, 1);
        vector::push_back(&mut numbers, 2);
        vector::push_back(&mut numbers, 2);
        vector::push_back(&mut numbers, 4);
        vector::push_back(&mut numbers, 5);
        vector::push_back(&mut numbers, 6);

        lottery::buy_ticket(admin, numbers);
    }

    #[test(admin = @lottery)]
    #[expected_failure(abort_code = 0x10004)]
    fun test_buy_ticket_number_too_high(admin: &signer) {
        lottery::init_for_testing(admin);

        let numbers = vector::empty<u8>();
        vector::push_back(&mut numbers, 1);
        vector::push_back(&mut numbers, 2);
        vector::push_back(&mut numbers, 3);
        vector::push_back(&mut numbers, 4);
        vector::push_back(&mut numbers, 5);
        vector::push_back(&mut numbers, 50);

        lottery::buy_ticket(admin, numbers);
    }

    #[test(admin = @lottery)]
    fun test_execute_draw(admin: &signer) {
        lottery::init_for_testing(admin);

        let winning_numbers = vector::empty<u8>();
        vector::push_back(&mut winning_numbers, 7);
        vector::push_back(&mut winning_numbers, 14);
        vector::push_back(&mut winning_numbers, 21);
        vector::push_back(&mut winning_numbers, 28);
        vector::push_back(&mut winning_numbers, 35);
        vector::push_back(&mut winning_numbers, 42);

        lottery::execute_draw(admin, winning_numbers, 15);

        let admin_addr = signer::address_of(admin);
        assert!(lottery::is_draw_complete(admin_addr), 0);
    }

    #[test]
    fun test_count_matches() {
        let ticket = vector::empty<u8>();
        vector::push_back(&mut ticket, 1);
        vector::push_back(&mut ticket, 2);
        vector::push_back(&mut ticket, 3);
        vector::push_back(&mut ticket, 4);
        vector::push_back(&mut ticket, 5);
        vector::push_back(&mut ticket, 6);

        let winning = vector::empty<u8>();
        vector::push_back(&mut winning, 1);
        vector::push_back(&mut winning, 2);
        vector::push_back(&mut winning, 7);
        vector::push_back(&mut winning, 8);
        vector::push_back(&mut winning, 9);
        vector::push_back(&mut winning, 10);

        let matches = lottery::count_matches(&ticket, &winning);
        assert!(matches == 2, 0);
    }

    #[test]
    fun test_count_matches_all_match() {
        let ticket = vector::empty<u8>();
        vector::push_back(&mut ticket, 1);
        vector::push_back(&mut ticket, 2);
        vector::push_back(&mut ticket, 3);
        vector::push_back(&mut ticket, 4);
        vector::push_back(&mut ticket, 5);
        vector::push_back(&mut ticket, 6);

        let winning = vector::empty<u8>();
        vector::push_back(&mut winning, 1);
        vector::push_back(&mut winning, 2);
        vector::push_back(&mut winning, 3);
        vector::push_back(&mut winning, 4);
        vector::push_back(&mut winning, 5);
        vector::push_back(&mut winning, 6);

        let matches = lottery::count_matches(&ticket, &winning);
        assert!(matches == 6, 0);
    }

    #[test]
    fun test_has_bonus_number() {
        let ticket = vector::empty<u8>();
        vector::push_back(&mut ticket, 1);
        vector::push_back(&mut ticket, 2);
        vector::push_back(&mut ticket, 3);
        vector::push_back(&mut ticket, 4);
        vector::push_back(&mut ticket, 5);
        vector::push_back(&mut ticket, 6);

        assert!(lottery::has_bonus_number(&ticket, 3) == true, 0);
        assert!(lottery::has_bonus_number(&ticket, 7) == false, 1);
    }

    #[test(admin = @lottery, buyer1 = @0x123, buyer2 = @0x456)]
    fun test_multiple_tickets(admin: &signer, buyer1: &signer, buyer2: &signer) {
        lottery::init_for_testing(admin);

        let numbers1 = vector::empty<u8>();
        vector::push_back(&mut numbers1, 1);
        vector::push_back(&mut numbers1, 2);
        vector::push_back(&mut numbers1, 3);
        vector::push_back(&mut numbers1, 4);
        vector::push_back(&mut numbers1, 5);
        vector::push_back(&mut numbers1, 6);

        let numbers2 = vector::empty<u8>();
        vector::push_back(&mut numbers2, 7);
        vector::push_back(&mut numbers2, 8);
        vector::push_back(&mut numbers2, 9);
        vector::push_back(&mut numbers2, 10);
        vector::push_back(&mut numbers2, 11);
        vector::push_back(&mut numbers2, 12);

        lottery::buy_ticket(buyer1, numbers1);
        lottery::buy_ticket(buyer2, numbers2);

        let admin_addr = signer::address_of(admin);
        assert!(lottery::get_total_tickets_sold(admin_addr) == 2, 0);
        assert!(lottery::get_prize_pool(admin_addr) == 2000, 1);
    }
}