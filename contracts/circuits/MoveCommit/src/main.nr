use std::hash::pedersen_commitment;
use std::embedded_curve_ops::{
    EmbeddedCurvePoint,
};

// The key trick is:
// The product of two values is zero if either is zero.
// So, encode the condition as:
// (user_role-1)xuser_target=0
// This forces that either:
// user_role == 1 (then any user_target allowed), or
// user_target == 0 (if user_role ne 1, then user_target must be zero)

fn main(
    user_role: Field,        
    user_target: Field,
    random_secret: Field 
) -> pub EmbeddedCurvePoint {
    assert((user_role - 1) * user_target == 0);
    let user_role_commitment = pedersen_commitment([user_role, user_target, random_secret]);
    user_role_commitment
}
