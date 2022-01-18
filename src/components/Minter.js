import { useEffect, useState } from "react";
import Caver from "caver-js";
import contract from "../contracts/contract.json";
import ggnz from "../assets/ggnz.gif";
import Footer from "./Footer";
const initialInfoState = {
    connected: false,
    status: null,
    account: null,
    caver: null,
    contract: null,
    address: null,
    contractJSON: null,
    keyring: null,
};

const initialMintState = {
    loading: false,
    status: `Mint your ${contract.name}`,
    amount: null,
    supply: "0",
    cost: "0",
};

const MAGICWORD = "Jini";

const MAX_MINT_AMOUNT = 40;
const MIN_MINT_AMOUNT = 1;

function Minter() {
    const [info, setInfo] = useState(initialInfoState);
    const [mintInfo, setMintInfo] = useState(initialMintState);
    const [disabled, setDisabled] = useState(true);
    const [isOwner, setIsOwner] = useState(false);

    const init = async (_request, _contractJSON) => {
        if (window.klaytn.isKaikas) {
            try {
                const accounts = await window.klaytn.enable();
                const networkId = await window.klaytn.networkVersion;

                if (networkId == _contractJSON.chain_id) {
                    let caver = new Caver(window.klaytn);
                    let contract = new caver.klay.Contract(
                        _contractJSON.abi,
                        _contractJSON.address
                    );

                    setInfo((prevState) => ({
                        ...prevState,
                        connected: true,
                        status: null,
                        account: accounts[0],
                        caver: caver,
                        contract: contract,
                        contractJSON: _contractJSON,
                    }));

                    handleOwnerChanged(contract, accounts[0]);
                }
            } catch (err) {
                setInfo(() => ({
                    ...initialInfoState,
                }));
            }
        } else {
            setInfo(() => ({
                ...initialInfoState,
                status: "Please install Kaikas.",
            }));
        }
    };

    const initListeners = () => {
        if (window.klaytn) {
            window.klaytn.on("accountsChanged", () => {
                window.location.reload();
            });
            window.klaytn.on("networkChanged", () => {
                window.location.reload();
            });
        }
    };

    const getSupply = async () => {
        try {
            const result = await info.contract.call("totalSupply");
            setMintInfo((prevState) => ({
                ...prevState,
                supply: info.caver.utils.hexToNumberString(result),
            }));
        } catch (err) {
            setMintInfo((prevState) => ({
                ...prevState,
                supply: 0,
            }));
        }
    };

    const getCost = async () => {
        try {
            const result = await info.contract.call("getPrice");

            setMintInfo((prevState) => ({
                ...prevState,
                cost: info.caver.utils.hexToNumberString(
                    info.caver.utils.convertFromPeb(result, "KLAY")
                ),
            }));
        } catch (err) {
            setMintInfo((prevState) => ({
                ...prevState,
                cost: contract.total_supply,
            }));
        }
    };

    const mint = async () => {
        try {
            setMintInfo((prevState) => ({
                ...prevState,
                loading: true,
                status: `Minting ${mintInfo.amount}...`,
            }));
            let encodedCall = await info.caver.abi.encodeFunctionCall(
                {
                    name: "mintBatch",
                    type: "function",
                    inputs: [
                        {
                            name: "to",
                            type: "address",
                        },
                        {
                            name: "_mintAmount",
                            type: "uint256",
                        },
                        { name: "_magicword", type: "string" },
                    ],
                },
                [info.account, mintInfo.amount, MAGICWORD]
            );
            await info.caver.klay.sendTransaction({
                type: "SMART_CONTRACT_EXECUTION",
                from: info.account,
                to: info.contractJSON.address,
                input: encodedCall,
                gas: "2500000",
                value: String(
                    info.caver.utils.toPeb(
                        Number(mintInfo.cost) * mintInfo.amount
                    )
                ),
            });

            setMintInfo((prevState) => ({
                ...prevState,
                loading: false,
                status: "Minting Complete!",
            }));
            getSupply();
        } catch (err) {
            setMintInfo((prevState) => ({
                ...prevState,
                loading: false,
                status: "NFT minting Failed T.T",
            }));
        }
    };

    const updateAmount = (newAmount) => {
        if (newAmount <= 40 && newAmount >= 1) {
            setMintInfo((prevState) => ({
                ...prevState,
                amount: newAmount,
            }));
        } else {
            setMintInfo((prev) => ({
                ...prev,
                amount: undefined,
            }));
        }
    };

    const handleWithdraw = async () => {
        try {
            setMintInfo((prevState) => ({
                ...prevState,
                loading: true,
                status: `Withdrawing...`,
            }));

            await info.contract.methods
                .withdraw()
                .send({ from: info.account, gas: "2500000" });
            setMintInfo((prevState) => ({
                ...prevState,
                status: "Withdrawing completed",
            }));
            setInfo((prev) => ({
                ...prev,
                state: "Withdraw Complete!",
            }));
        } catch (err) {
            setMintInfo((prev) => ({
                ...prev,
                status: "Withdraw Failed T.T",
            }));
        }
    };

    const connectToContract = (_contractJSON) => {
        init("klay_getAccount", _contractJSON);
    };

    const handleButton = (val) => {
        if (val <= MAX_MINT_AMOUNT && val >= MIN_MINT_AMOUNT) {
            setDisabled(false);
        } else {
            setDisabled(true);
        }
    };

    const handleOwnerChanged = async (contract, account) => {
        try {
            const result = await contract.methods
                .owner()
                .call({ from: account });

            if (account === result.toLowerCase()) {
                setIsOwner(true);
            } else {
                setIsOwner(false);
            }
        } catch (err) {
            setIsOwner(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setMintInfo((prev) => ({
            ...prev,
            amount: "",
        }));
    };

    useEffect(() => {
        connectToContract(contract);
        initListeners();
    }, []);

    useEffect(() => {
        if (info.connected) {
            getSupply();
            getCost();
        }
    }, [info.connected]);

    return (
        <div className="page">
            <div className="card">
                {/* 헤더 */}
                <div className="card_header">
                    <img
                        className="card_header_image ns"
                        alt={"banner"}
                        src={ggnz}
                    />
                </div>

                <div className="contents">
                    {mintInfo.supply < contract.total_supply ? (
                        <div className="card_body">
                            <div className="title__and__remaining">
                                <div className="title">{contract.name} </div>

                                {info.connected ? (
                                    <div className="remaining__and__price">
                                        <div className="remaining">
                                            {/* 남은 NFT */}
                                            Remaing:{" "}
                                            {contract.total_supply -
                                                mintInfo.supply}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                            {/* 민팅 버튼*/}
                            <div className="minting">
                                <div className="minting_box">
                                    <form onSubmit={handleSubmit}>
                                        <input
                                            className="minting_amount"
                                            type="text"
                                            placeholder="mint amount"
                                            value={mintInfo.amount}
                                            onChange={(e) => {
                                                updateAmount(e.target.value);
                                                handleButton(e.target.value);
                                            }}
                                        ></input>

                                        {info.connected ? (
                                            <div className="minting_total">
                                                {/* 가격 */}(
                                                {mintInfo.amount === undefined
                                                    ? 0
                                                    : mintInfo.cost *
                                                      mintInfo.amount}{" "}
                                                {contract.chain_symbol})
                                            </div>
                                        ) : null}
                                        <input
                                            type="submit"
                                            className="minting_button"
                                            onClick={() => mint()}
                                            disabled={disabled}
                                            value="Mint"
                                        ></input>
                                    </form>
                                </div>

                                {mintInfo.status ? (
                                    <p className="statusText">
                                        {mintInfo.status}
                                    </p>
                                ) : null}
                                {info.status ? (
                                    <p className="statusText">{info.status}</p>
                                ) : null}
                            </div>
                            {isOwner ? (
                                <button
                                    className="withdraw"
                                    onClick={handleWithdraw}
                                >
                                    Withdraw
                                </button>
                            ) : (
                                ""
                            )}
                        </div>
                    ) : (
                        <div className="card_body">
                            {/* 다 팔린 경우 */}

                            <div className="statusText">
                                We've sold out! .You can still buy and trade the{" "}
                                {contract.name} on marketplaces such as Opensea.
                            </div>
                            {isOwner ? (
                                <button
                                    className="withdraw"
                                    onClick={handleWithdraw}
                                >
                                    Withdraw
                                </button>
                            ) : (
                                ""
                            )}
                        </div>
                    )}

                    <Footer
                        mintInfo={mintInfo}
                        info={info}
                        connectToContract={connectToContract}
                    />
                </div>
                <a
                    style={{
                        position: "absolute",
                        bottom: 55,
                        left: -75,
                    }}
                    className="_90 contract_url"
                    target="_blank"
                    href={
                        contract.chain_id === 8217
                            ? `https://scope.klaytn.com/account/${contract.address}`
                            : `https://baobab.scope.klaytn.com/account/${contract.address}`
                    }
                >
                    View Contract
                </a>
            </div>
        </div>
    );
}

export default Minter;
