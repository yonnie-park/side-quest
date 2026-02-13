#[test_only]
module lottery::lottery_tests {
    use std::signer;
    use std::vector;
    use std::debug;
    use lottery::lottery;

    #[test(admin = @lottery)]
    fun test_initialize(admin: &signer) {
        lottery::init_for_testing(admin);
        let admin_addr = signer::address_of(admin);
        
        debug::print(&b"=== Test: Initialize ===");
        debug::print(&b"Current draw ID:");
        debug::print(&lottery::get_current_draw_id(admin_addr));
        debug::print(&b"Total tickets sold:");
        debug::print(&lottery::get_total_tickets_sold(admin_addr));
        
        assert!(lottery::get_current_draw_id(admin_addr) == 1, 0);
        assert!(lottery::get_total_tickets_sold(admin_addr) == 0, 1);
    }

    #[test(admin = @lottery)]
    fun test_random_numbers_unique(admin: &signer) {
        lottery::init_for_testing(admin);
        lottery::execute_draw(admin);
        
        let admin_addr = signer::address_of(admin);
        let numbers = lottery::get_winning_numbers(admin_addr);
        
        debug::print(&b"=== Test: Random Numbers Unique ===");
        debug::print(&b"Winning numbers:");
        debug::print(&numbers);
        
        let i = 0;
        while (i < 6) {
            let num = *vector::borrow(&numbers, i);
            assert!(num >= 1 && num <= 45, 100);
            
            let j = i + 1;
            while (j < 6) {
                let other = *vector::borrow(&numbers, j);
                assert!(num != other, 101);
                j = j + 1;
            };
            i = i + 1;
        };
        debug::print(&b"All numbers are unique and in range [1-45]!");
    }

    #[test(admin = @lottery, buyer = @0x123)]
    fun test_full_lottery_cycle(admin: &signer, buyer: &signer) {
        lottery::init_for_testing(admin);
        
        debug::print(&b"=== Test: Full Lottery Cycle ===");
        
        // Buy ticket
        let numbers = vector::empty<u8>();
        vector::push_back(&mut numbers, 1);
        vector::push_back(&mut numbers, 7);
        vector::push_back(&mut numbers, 14);
        vector::push_back(&mut numbers, 21);
        vector::push_back(&mut numbers, 28);
        vector::push_back(&mut numbers, 35);
        
        debug::print(&b"Player's ticket:");
        debug::print(&numbers);
        
        lottery::buy_ticket_for_testing(buyer, numbers);
        
        let buyer_addr = signer::address_of(buyer);
        let admin_addr = signer::address_of(admin);
        
        debug::print(&b"Tickets purchased:");
        debug::print(&lottery::get_user_ticket_count(buyer_addr));
        
        let prize_pool_before = lottery::get_prize_pool(admin_addr);
        debug::print(&b"Prize pool (before draw):");
        debug::print(&prize_pool_before);
        
        // Execute draw
        lottery::execute_draw(admin);
        
        let winning_numbers = lottery::get_winning_numbers(admin_addr);
        debug::print(&b"Winning numbers:");
        debug::print(&winning_numbers);
        
        // Count matches
        let matches = 0u8;
        let i = 0;
        while (i < 6) {
            let player_num = *vector::borrow(&numbers, i);
            if (vector::contains(&winning_numbers, &player_num)) {
                matches = matches + 1;
            };
            i = i + 1;
        };
        debug::print(&b"Number of matches:");
        debug::print(&matches);
        
        assert!(lottery::get_user_ticket_count(buyer_addr) == 1, 200);
        assert!(lottery::is_draw_complete(admin_addr), 203);
        assert!(prize_pool_before == 1000000000, 205);
    }

    #[test(admin = @lottery, buyer1 = @0x123, buyer2 = @0x456)]
    fun test_multiple_tickets(admin: &signer, buyer1: &signer, buyer2: &signer) {
        lottery::init_for_testing(admin);
        
        debug::print(&b"=== Test: Multiple Tickets ===");
        
        // Buyer 1
        let numbers1 = vector::empty<u8>();
        vector::push_back(&mut numbers1, 1);
        vector::push_back(&mut numbers1, 2);
        vector::push_back(&mut numbers1, 3);
        vector::push_back(&mut numbers1, 4);
        vector::push_back(&mut numbers1, 5);
        vector::push_back(&mut numbers1, 6);
        
        debug::print(&b"Buyer 1's ticket:");
        debug::print(&numbers1);
        lottery::buy_ticket_for_testing(buyer1, numbers1);
        
        // Buyer 2
        let numbers2 = vector::empty<u8>();
        vector::push_back(&mut numbers2, 10);
        vector::push_back(&mut numbers2, 20);
        vector::push_back(&mut numbers2, 30);
        vector::push_back(&mut numbers2, 40);
        vector::push_back(&mut numbers2, 41);
        vector::push_back(&mut numbers2, 42);
        
        debug::print(&b"Buyer 2's ticket:");
        debug::print(&numbers2);
        lottery::buy_ticket_for_testing(buyer2, numbers2);
        
        let admin_addr = signer::address_of(admin);
        let total_tickets = lottery::get_total_tickets_sold(admin_addr);
        debug::print(&b"Total tickets sold:");
        debug::print(&total_tickets);
        
        let prize_pool = lottery::get_prize_pool(admin_addr);
        debug::print(&b"Total prize pool:");
        debug::print(&prize_pool);
        
        // Execute draw
        lottery::execute_draw(admin);
        let winning_numbers = lottery::get_winning_numbers(admin_addr);
        debug::print(&b"Winning numbers:");
        debug::print(&winning_numbers);
        
        // Check matches for buyer 1
        let matches1 = 0u8;
        let i = 0;
        while (i < 6) {
            if (vector::contains(&winning_numbers, vector::borrow(&numbers1, i))) {
                matches1 = matches1 + 1;
            };
            i = i + 1;
        };
        debug::print(&b"Buyer 1 matches:");
        debug::print(&matches1);
        
        // Check matches for buyer 2
        let matches2 = 0u8;
        i = 0;
        while (i < 6) {
            if (vector::contains(&winning_numbers, vector::borrow(&numbers2, i))) {
                matches2 = matches2 + 1;
            };
            i = i + 1;
        };
        debug::print(&b"Buyer 2 matches:");
        debug::print(&matches2);
        
        assert!(total_tickets == 2, 302);
        assert!(prize_pool == 2000000000, 303);
    }
}
