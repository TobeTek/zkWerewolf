forge-compile:
	forge build --root contracts

nargo-compile:
	find contracts/circuits -mindepth 1 -maxdepth 1 -type d -exec sh -c 'echo "Compiling {}" && cd "{}" && nargo compile' \;

package-game:
	./packageGame.sh