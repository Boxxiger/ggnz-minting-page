import { useEffect, useState } from "react";
import Caver from "caver-js";
import contract from "../contracts/contract2.json";
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
};

const initialMintState = {
    loading: false,
    status: `Mint your ${contract.name}`,
    amount: null,
    supply: "0",
    cost: "0",
};
const MAX_MINT_AMOUNT = 40;
const MIN_MINT_AMOUNT = 1;

function Minter() {
    const [info, setInfo] = useState(initialInfoState);
    const [mintInfo, setMintInfo] = useState(initialMintState);
    const [isEnabled, setIsEnabled] = useState(false);
    const [caver, setCaver] = useState();
    const defaultUnit = "000000000000000000";
    const [disabled, setDisabled] = useState(true);
    const [isOwner, setIsOwner] = useState(false);
    console.log(mintInfo);

    // init 함수: 메타마스크 연결
    const init = async (_request, _contractJSON) => {
        if (window.klaytn.isKaikas) {
            try {
                const accounts = await window.klaytn.enable();
                const networkId = await window.klaytn.networkVersion;
                // networkId
                // 1001: 바오밥
                // 8217: 사이프러스~

                // 폴리곤 chain id인 경우 지갑 통해서 네트워크 연결

                if (networkId == _contractJSON.chain_id) {
                    // 수정필요
                    let caver = new Caver(window.klaytn);
                    let contract = new caver.klay.Contract(
                        _contractJSON.abi,
                        _contractJSON.address
                    );
                    setCaver(caver);

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
                } else {
                    setInfo(() => ({
                        ...initialInfoState,
                        status: `Change network to ${_contractJSON.chain}.`,
                    }));
                }
            } catch (err) {
                console.log(err.message);
                setInfo(() => ({
                    ...initialInfoState,
                }));
            }
        } else {
            setInfo(() => ({
                ...initialInfoState,
                status: "Please install metamask.",
            }));
        }
    };

    // initListeners 함수: 계정이나 체인이 변경되었는지 확인
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
        const params = {
            gas: "0x2710",
            to: info.contractJSON.address,
            from: window.klaytn.selectedAddress,
            data: info.contract.methods.totalSupply().encodeABI(),
        };
        try {
            // const result = await caver.klay.sendAsync({
            //     method: "klay_call",
            //     params: [params],
            // });
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
        const params = {
            to: info.contractJSON.address,
            from: info.account,
            data: info.contract.methods.getPrice().encodeABI(),
        };
        try {
            // const result = await window.klaytn.sendAsync({
            //     method: "klay_call",
            //     params: [params],
            // });
            // console.log(info.caver.utils.hexToNumberString(result));
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
                cost: "0",
            }));
        }
    };

    const mint = async () => {
        try {
            const params = {
                to: info.contractJSON.address,
                from: info.account,
                gas: "2500000",
                value: String(
                    info.caver.utils.toHex(
                        Number(mintInfo.cost) * mintInfo.amount
                    )
                ),
                data: info.contract.methods
                    .mintBatch(info.account, mintInfo.amount)
                    .encodeABI(),
            };
            setMintInfo((prevState) => ({
                ...prevState,
                loading: true,
                status: `Minting ${mintInfo.amount}...`,
            }));
            // ===============Account2로는 되는데 Account1로는 안되는 코드=============
            const txHash = await window.klaytn.sendAsync({
                method: "klay_sendTransaction",
                params: [params],
                from: info.account,
            });
            console.log(txHash);
            // ================================================================
            //> myContract.send({ from: '0x{address in hex}', gas: 1000000 }, 'methodName', 123).then(console.log)

            // const result = await info.contract.send(
            //     params,
            //     "mintBatch",

            //     info.account,
            //     mintInfo.amount
            // );
            // console.log("result", result);

            // await window.klaytn.sendAsync(
            //     {
            //         method: "klay_sendTransaction",
            //         params: [
            //             {
            //                 gas: "2500000",
            //                 to: "0xA2c6d1E3dE2159c7C2fA8037B252D85a770730Ca",
            //                 from: info.account,
            //                 data: info.contract.methods
            //                     .setMaximum("3000")
            //                     .encodeABI(),
            //             },
            //         ],
            //     },
            //     console.log
            // );

            // const result = await info.contract.send(
            //     {
            //         from: info.account,
            //         gas: "2500000",
            //         value: caver.utils.toHex(
            //             String(Number(mintInfo.cost) * mintInfo.amount) +
            //                 defaultUnit
            //         ),
            //     },
            //     "mintBatch",
            //     info.account,
            //     mintInfo.amount
            // );

            // info.contract.methods.mintBatch(info.account, mintInfo.amount).send(
            //     {
            //         from: info.account,
            //         gas: 2500000,
            //         value: caver.utils.toHex(
            //             String(Number(mintInfo.cost) * mintInfo.amount) +
            //                 defaultUnit
            //         ),
            //     },
            //     console.log
            // );

            // const data = caver.klay.abi.encodeFunctionCall(
            //     {
            //         name: "mintBatch",
            //         type: "function",

            //         constant: false,
            //         inputs: [
            //             { name: "to", type: "address" },
            //             { name: "_mintAmount", type: "uint256" },
            //         ],
            //         outputs: [],
            //         payable: true,
            //         stateMutability: "payable",
            //         signature: "0x248b71fc",
            //     },
            //     [info.account, 1]
            // );

            // caver.klay
            //     .sendTransaction({
            //         from: info.account,
            //         to: "0xA2c6d1E3dE2159c7C2fA8037B252D85a770730Ca",
            //         data,
            //         gas: 2500000,
            //         value: "1" + defaultUnit,
            //     })
            //     .on("transactionHash", (txHash) => {
            //         console.log("txHash", txHash);
            //     })
            //     .on("receipt", (receipt) => {
            //         console.log("receipt", receipt);
            //     });

            // await info.contract.send(
            //     {
            //         from: info.account,
            //         gas: 2500000,
            //     },
            //     "mint",
            //     info.account,
            //     1
            // );
            setMintInfo((prevState) => ({
                ...prevState,
                loading: false,
                status: "Nice! Your NFT will show up on Opensea, once the transaction is successful.",
            }));
            getSupply();
        } catch (err) {
            console.error(err);
            setMintInfo((prevState) => ({
                ...prevState,
                loading: false,
                status: err.message,
            }));
        }
    };

    const updateAmount = (newAmount) => {
        if (newAmount <= 40 && newAmount >= 1) {
            setMintInfo((prevState) => ({
                ...prevState,
                amount: newAmount,
                status: `Mint your ${contract.name}`,
            }));
        } else {
            setMintInfo((prev) => ({
                ...prev,
                amount: undefined,
                status: "민팅은 한번에 40개까지 가능합니다.",
            }));
        }
    };

    const handleWithdraw = async () => {
        // const params = {
        //     to: info.contractJSON.address,
        //     from: info.account,
        //     gas: "2500000",

        //     data: info.contract.methods.withdraw().encodeABI(),
        // };
        setMintInfo((prevState) => ({
            ...prevState,
            loading: true,
            status: `Withdrawing...`,
        }));
        // const txHash = await window.klaytn.sendAsync({
        //     method: "klay_sendTransaction",
        //     params: [params],
        //     from: info.account,
        // });
        await info.contract.methods
            .withdraw()
            .send({ from: info.account, gas: "2500000" });
        setMintInfo((prevState) => ({
            ...prevState,
            status: "Withdrawing completed",
        }));
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
            console.log(err);
        }
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
                            <div className="title">{contract.name} </div>

                            {info.connected ? (
                                <div className="remaining__and__price">
                                    <div className="remaining">
                                        {/* 남은 NFT */}
                                        Remaing:{" "}
                                        {contract.total_supply -
                                            mintInfo.supply}
                                    </div>
                                    {/* <div className="price">
                                        price: 1 {contract.chain_symbol}
                                    </div> */}
                                </div>
                            ) : null}

                            {/* 민팅 버튼*/}
                            <div className="minting">
                                <div className="minting_box">
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
                                    <button
                                        className="minting_button"
                                        onClick={() => mint()}
                                        disabled={disabled}
                                    >
                                        Mint
                                    </button>
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
                        </div>
                    ) : (
                        <div className="card_body">
                            {/* 다 팔린 경우 */}

                            <div className="statusText">
                                We've sold out! .You can still buy and trade the{" "}
                                {contract.name} on marketplaces such as Opensea.
                            </div>
                        </div>
                    )}
                    {isOwner ? (
                        <button className="withdraw" onClick={handleWithdraw}>
                            withdraw
                        </button>
                    ) : (
                        ""
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
                    className="_90"
                    target="_blank"
                    href={`https://baobab.scope.klaytn.com/account/${contract.address}`}
                >
                    View Contract
                </a>
            </div>
        </div>
    );
}

export default Minter;
