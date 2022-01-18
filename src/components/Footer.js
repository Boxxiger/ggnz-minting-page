import contract from "../contracts/contract.json";
function Footer({ mintInfo, info, connectToContract }) {
    return (
        <div className="card_footer">
            <button
                className="button"
                style={{
                    backgroundColor: info.connected
                        ? "var(--success)"
                        : "var(--warning)",
                }}
                onClick={() => connectToContract(contract)}
            >
                {info.account ? "Connected" : "Connect Wallet"}
            </button>
            {info.connected ? (
                <span className="accountText">
                    {String(info.account).substring(0, 6) +
                        "..." +
                        String(info.account).substring(38)}
                    {/* {String(info.account)} */}
                </span>
            ) : null}
        </div>
    );
}
export default Footer;
