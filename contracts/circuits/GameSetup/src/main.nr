use std::hash::pedersen_hash;

// This circuit proves:
// - The user has a valid array of user addresses and knows the corresponding roles.
// - The number of werewolves in the assignment is correct.
// - All roles are either a Villager (0) or a Werewolf (1).

fn main(
    user_addresses: [Field; 6], // private: user addresses
    assigned_roles: [Field; 6], // private: 0 (villager), 1 (werewolf)
    user_role_proofs: [Field; 6], // private: user-specific salts for commitments
    user_addresses_hash: pub Field, // public: hash of all user addresses
    werewolf_count: pub Field, // public: number of werewolves
) -> pub [Field; 6] {
    assert(pedersen_hash(user_addresses) == user_addresses_hash);

    let mut actual_werewolf_count = 0;
    let mut user_role_commitments: [Field; 6] = [0; 6];

    for i in 0..6 {
        {
            assert(assigned_roles[i] * (assigned_roles[i] - 1) == 0);

            // If the role is a werewolf (1), increment the counter.
            if assigned_roles[i] == 1 {
                actual_werewolf_count += 1;
            }

            // Create a public commitment for each user and their role.
            user_role_commitments[i] = pedersen_hash([
                user_addresses[i], assigned_roles[i], user_role_proofs[i]
            ]);
        }
    }
    assert(actual_werewolf_count == werewolf_count);
    
    user_role_commitments
}
