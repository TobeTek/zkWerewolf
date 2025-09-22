// This circuit proves:
// - The user has a valid array of user addresses and knows the corresponding roles.
// - The number of werewolves in the assignment is correct.
// - All roles are either a Villager (0) or a Werewolf (1).

fn main(
    user_addresses: [Field; N], // private: user addresses
    assigned_roles: [Field; N], // private: 0 (villager), 1 (werewolf)
    user_role_proofs: [Field; N], // private: user-specific salts for commitments

    user_addresses_hash: pub Field, // public: hash of all user addresses
    werewolf_count: pub Field, // public: number of werewolves
) -> pub [Field; N] { // public: user-role commitments

    // The length of the arrays, N, is known at compile time and doesn't need
    // to be passed as an input. It can be derived from the array size.

    // 1. Constrain the hash of the user addresses to be correct.
    constrain(hash_poseidon(user_addresses) == user_addresses_hash);

    // 2. Initialize a counter for werewolves.
    let mut actual_werewolf_count = 0;
    let mut user_role_commitments: [Field; N] = [0; N];

    // 3. Iterate through each player, constraining their role and creating a commitment.
    for i in 0..N {
        // The loop body must be enclosed in curly braces.
        {
            // Constrain the role to be either 0 or 1.
            // We use an assert instead of a constraint, which is more
            // gas-efficient and is a common pattern for logical checks.
            assert(assigned_roles[i] == 0 || assigned_roles[i] == 1);

            // If the role is a werewolf (1), increment the counter.
            if assigned_roles[i] == 1 {
                actual_werewolf_count += 1;
            }

            // Create a public commitment for each user and their role.
            user_role_commitments[i] = hash_poseidon([
                user_addresses[i], assigned_roles[i], user_role_proofs[i]
            ]);
        }
    }

    // 4. Constrain the actual werewolf count to equal the public input.
    constrain(actual_werewolf_count == werewolf_count);

    // 5. Return the public commitments.
    return user_role_commitments;
}


fn main(x: Field, y: Field, z: pub Field) {
    assert(z == x*y);
}