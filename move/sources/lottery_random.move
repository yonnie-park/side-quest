module lottery::lottery_random {
    use std::vector;
    use std::hash;
    use std::bcs;
    use initia_std::block;
    use initia_std::transaction_context;
    
    const NUMBERS_TO_PICK: u64 = 6;
    const MIN_NUMBER: u8 = 1;
    const MAX_NUMBER: u8 = 45;
    
    /// Generate random numbers using block info and transaction hash
    public fun generate_random_numbers(): vector<u8> {
        let numbers = vector::empty<u8>();
        
        // Get randomness sources
        let (height, timestamp) = block::get_block_info();
        let tx_hash = transaction_context::get_transaction_hash();
        
        // Combine sources for seed
        let seed_bytes = vector::empty<u8>();
        vector::append(&mut seed_bytes, bcs::to_bytes(&height));
        vector::append(&mut seed_bytes, bcs::to_bytes(&timestamp));
        vector::append(&mut seed_bytes, tx_hash);
        
        let seed_hash = hash::sha3_256(seed_bytes);
        
        // Generate 6 unique numbers from 1-45
        let i = 0;
        while (i < NUMBERS_TO_PICK) {
            let random_index = (i * 7 + 13) % 32;
            let hash_byte = *vector::borrow(&seed_hash, random_index);
            let number = (hash_byte % (MAX_NUMBER - MIN_NUMBER + 1)) + MIN_NUMBER;
            
            if (!vector::contains(&numbers, &number)) {
                vector::push_back(&mut numbers, number);
                i = i + 1;
            } else {
                seed_hash = hash::sha3_256(seed_hash);
            };
        };
        
        sort_numbers(&mut numbers);
        numbers
    }
    
    /// Generate a random bonus number
    public fun generate_bonus_number(existing_numbers: &vector<u8>): u8 {
        let (height, timestamp) = block::get_block_info();
        let tx_hash = transaction_context::get_transaction_hash();
        
        let seed_bytes = vector::empty<u8>();
        vector::append(&mut seed_bytes, bcs::to_bytes(&timestamp));
        vector::append(&mut seed_bytes, tx_hash);
        vector::append(&mut seed_bytes, bcs::to_bytes(&height));
        
        let seed_hash = hash::sha3_256(seed_bytes);
        let hash_byte = *vector::borrow(&seed_hash, 0);
        
        let bonus = (hash_byte % (MAX_NUMBER - MIN_NUMBER + 1)) + MIN_NUMBER;
        
        while (vector::contains(existing_numbers, &bonus)) {
            seed_bytes = hash::sha3_256(seed_bytes);
            let new_hash = hash::sha3_256(seed_bytes);
            let new_byte = *vector::borrow(&new_hash, 0);
            bonus = (new_byte % (MAX_NUMBER - MIN_NUMBER + 1)) + MIN_NUMBER;
        };
        
        bonus
    }
    
    /// Simple bubble sort
    fun sort_numbers(numbers: &mut vector<u8>) {
        let len = vector::length(numbers);
        let i = 0;
        while (i < len) {
            let j = 0;
            while (j < len - i - 1) {
                let a = *vector::borrow(numbers, j);
                let b = *vector::borrow(numbers, j + 1);
                if (a > b) {
                    vector::swap(numbers, j, j + 1);
                };
                j = j + 1;
            };
            i = i + 1;
        };
    }
}
