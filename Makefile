forge-compile:
	forge build --root contracts

nargo-compile:
	cd contracts/circuit && nargo compile

package-game:
	./packageGame.sh