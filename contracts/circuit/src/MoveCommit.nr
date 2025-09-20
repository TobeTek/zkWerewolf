// Accepts: user_role, user_role_proof, user_target, random_secret (all private)
// Outputs:
// move_commitment (hash of user_target, random_secret)
// user_role_commitment (hash of user_role, user_role_proof)
// Constraint: If user_role ≠ 1, user_target must be 0

fn main(
    user_role: Field,            // private: 0 (villager), 1 (werewolf)
    user_role_proof: Field,      // private: matches setup
    user_target: Field,          // private: desired target or 0 if villager
    random_secret: Field         // private: move-specific salt
) -> (
    pub Field,     // move_commitment
    pub Field      // user_role_commitment
) {
    if user_role != 1 {
        constrain(user_target == 0);
    }

    let move_commitment = hash_poseidon([user_target, random_secret]);
    let user_role_commitment = hash_poseidon([user_role, user_role_proof]);

    return (move_commitment, user_role_commitment);
}
