// This proves:
// - The right set of users is committed to.
// - The exact count of werewolves is correct.
// - All other roles are villagers.

fn main(
    user_addresses: [Field; N],        // private: user address field array
    assigned_roles: [Field; N],        // private: 0 (villager), 1 (werewolf)
    user_role_proofs: [Field; N],      // private: user-specific salts

    num_werewolves: pub Field,         // public: number of werewolves
    num_players: pub Field,            // public: number of players
) -> (
    pub Field,             // user_addresses_hash
    pub Field,             // roles_sum
    pub Field,             // roles_product
    pub [Field; N]         // user_role_commitments
) {
    constrain(N == num_players);

    let user_addresses_hash = hash_poseidon(user_addresses);

    let mut roles_sum = 0;
    let mut roles_product = 1;
    let mut werewolf_count = 0;
    let mut user_role_commitments: [Field; N] = [0; N];

    for i in 0..N {
        constrain(assigned_roles[i] == 0 || assigned_roles[i] == 1);

        roles_sum += assigned_roles[i];
        roles_product *= assigned_roles[i] + 1;
        if assigned_roles[i] == 1 {
            werewolf_count += 1;
        }
        user_role_commitments[i] = hash_poseidon([
            user_addresses[i], assigned_roles[i], user_role_proofs[i]
        ]);
    }
    constrain(werewolf_count == num_werewolves);

    return (user_addresses_hash, roles_sum, roles_product, user_role_commitments);
}
