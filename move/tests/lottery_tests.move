#[test_only]
module lottery::lottery_tests {
    use std::signer;
    use std::vector;
    use lottery::lottery;

    #[test(admin = @lottery)]
    fun test_initialize(admin: &signer) {
        lottery::init_for_testing(admin);
        
        let admin_addr = signer::address_of(admin);
        let draw_id = lottery::get_current_draw_id(admin_addr);
        assert!(draw_id == 1, 100);
        
        let total_sold = lottery::get_total_tickets_sold(admin_addr);
        assert!(total_sold == 0, 101);
    }

    #[test(admin = @lottery)]
    fun test_random_numbers_unique(admin: &signer) {
        lottery::init_for_testing(admin);
        let admin_addr = signer::address_of(admin);
        
        // Execute draw to generate winning numbers
        lottery::execute_draw(admin, 1);
        
        let numbers = lottery::get_winning_numbers(admin_addr, 1);
        let len = vector::length(&numbers);
        assert!(len == 6, 200);
        
        // Check all numbers are unique
        let i = 0;
        while (i < len) {
            let j = i + 1;
            while (j < len) {
                let num_i = *vector::borrow(&numbers, i);
                let num_j = *vector::borrow(&numbers, j);
                assert!(num_i != num_j, 201);
                j = j + 1;
            };
            i = i + 1;
        };
        
        // Check all numbers are in range 1-45
        let k = 0;
        while (k < len) {
            let num = *vector::borrow(&numbers, k);
            assert!(num >= 1 && num <= 45, 202);
            k = k + 1;
        };
        
        assert!(lottery::is_draw_complete(admin_addr, 1), 203);
    }

    #[test(admin = @lottery)]
    fun test_full_lottery_cycle(admin: &signer) {
        lottery::init_for_testing(admin);
        let admin_addr = signer::address_of(admin);
        
        // Buy ticket
        let numbers = vector::empty<u8>();
        vector::push_back(&mut numbers, 1);
        vector::push_back(&mut numbers, 7);
        vector::push_back(&mut numbers, 14);
        vector::push_back(&mut numbers, 21);
        vector::push_back(&mut numbers, 28);
        vector::push_back(&mut numbers, 35);
        
        lottery::buy_ticket_for_testing(admin, numbers);
        
        let prize_pool = lottery::get_current_prize_pool(admin_addr);
        assert!(prize_pool == 1000000000, 300);
        
        // Execute draw
        lottery::execute_draw(admin, 1);
        
        let winning_numbers = lottery::get_winning_numbers(admin_addr, 1);
        assert!(vector::length(&winning_numbers) == 6, 301);
        
        assert!(lottery::is_draw_complete(admin_addr, 1), 302);
    }

    #[test(admin = @lottery)]
    fun test_multiple_tickets(admin: &signer) {
        lottery::init_for_testing(admin);
        let admin_addr = signer::address_of(admin);
        
        // Ticket 1
        let numbers1 = vector::empty<u8>();
        vector::push_back(&mut numbers1, 1);
        vector::push_back(&mut numbers1, 2);
        vector::push_back(&mut numbers1, 3);
        vector::push_back(&mut numbers1, 4);
        vector::push_back(&mut numbers1, 5);
        vector::push_back(&mut numbers1, 6);
        lottery::buy_ticket_for_testing(admin, numbers1);
        
        // Ticket 2
        let numbers2 = vector::empty<u8>();
        vector::push_back(&mut numbers2, 10);
        vector::push_back(&mut numbers2, 20);
        vector::push_back(&mut numbers2, 30);
        vector::push_back(&mut numbers2, 40);
        vector::push_back(&mut numbers2, 41);
        vector::push_back(&mut numbers2, 42);
        lottery::buy_ticket_for_testing(admin, numbers2);
        
        let prize_pool = lottery::get_current_prize_pool(admin_addr);
        assert!(prize_pool == 2000000000, 400);
        
        lottery::execute_draw(admin, 1);
        let winning_numbers = lottery::get_winning_numbers(admin_addr, 1);
        assert!(vector::length(&winning_numbers) == 6, 401);
    }

    #[test(admin = @lottery)]
    fun test_force_new_draw(admin: &signer) {
        lottery::init_for_testing(admin);
        let admin_addr = signer::address_of(admin);
        
        assert!(lottery::get_current_draw_id(admin_addr) == 1, 500);
        
        lottery::force_new_draw(admin);
        
        assert!(lottery::get_current_draw_id(admin_addr) == 2, 501);
        assert!(lottery::is_draw_complete(admin_addr, 1), 502);
    }
}
