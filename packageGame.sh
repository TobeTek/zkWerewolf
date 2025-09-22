#!/bin/bash
. ./.env

echo $ACCOUNT_PRIVATE_KEY

# 
forge build --root contracts --via-ir
find contracts/circuits -mindepth 1 -maxdepth 1 -type d -exec sh -c 'echo "Compiling {}" && cd "{}" && nargo compile' \;

# Copy zkWerewolf ABI to root
cp contracts/out/ZkWerewolf.sol/ZkWerewolf.json source/ZkWerewolfABI.json
cp contracts/circuits/MoveCommit/target/MoveCommit.json  MoveCommit.json

# Other tools
#  | jq '.'
forge create --via-ir --rpc-url http://localhost:8545 --private-key $ACCOUNT_PRIVATE_KEY ZkWerewolf --json | jq '.' > forgeDeployment.json
