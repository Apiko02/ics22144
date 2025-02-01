import React, { useState, useEffect, useCallback } from "react";
import web3 from "./utils/web3";
import crowdfunding from "./utils/crowdfunding";

function App() {
    const [account, setAccount] = useState("");
    const [contractOwner, setContractOwner] = useState("");
    const [balance, setBalance] = useState("0");
    const [collectedFees, setCollectedFees] = useState("0");
    const [title, setTitle] = useState("");
    const [pledgeCost, setPledgeCost] = useState("");
    const [pledgesNeeded, setPledgesNeeded] = useState("");
    const [message, setMessage] = useState("");
    const [campaigns, setCampaigns] = useState([]);
    const [fulfilledCampaigns, setFulfilledCampaigns] = useState([]);
    const [canceledCampaigns, setCanceledCampaigns] = useState([]);
    const [newOwnerAddress, setNewOwnerAddress] = useState("");
    const [entrepreneurToBan, setEntrepreneurToBan] = useState("");

    // Memoize loadBlockchainData using useCallback
    const loadBlockchainData = useCallback(async () => {
        try {
            const accounts = await web3.eth.getAccounts();
            setAccount(accounts[0]);

            const owner = await crowdfunding.methods.owner().call();
            setContractOwner(owner);

            const contractBalance = await web3.eth.getBalance(crowdfunding.options.address);
            setBalance(web3.utils.fromWei(contractBalance, "ether"));

            const fees = await crowdfunding.methods.totalFeesAccumulated().call();
            setCollectedFees(web3.utils.fromWei(fees, "ether"));

            await loadCampaigns(accounts[0]);
        } catch (error) {
            console.error("❌ Error loading blockchain data:", error);
        }
    }, []); // Empty dependency array for useCallback

    useEffect(() => {
        loadBlockchainData();
    }, [loadBlockchainData]); // Add loadBlockchainData to the dependency array

    // Function to create a campaign
    const createCampaign = async (event) => {
        event.preventDefault();

        if (!title || !pledgeCost || !pledgesNeeded) {
            setMessage("⚠️ Please fill all fields!");
            return;
        }

        setMessage("⏳ Creating campaign...");

        try {
            const accounts = await web3.eth.getAccounts();
            const campaignFee = await crowdfunding.methods.campaignFee().call();
            const pledgeCostWei = web3.utils.toWei(pledgeCost, "ether");

            await crowdfunding.methods.createCampaign(title, pledgeCostWei, pledgesNeeded)
                .send({ from: accounts[0], value: campaignFee });

            setMessage("✅ Campaign created successfully!");
            await loadCampaigns(accounts[0]);
        } catch (error) {
            console.error("❌ Error:", error);
            setMessage("❌ Failed to create campaign.");
        }
    };

    // Function to load campaigns
    const loadCampaigns = async (userAddress) => {
        try {
            const campaignCount = await crowdfunding.methods.nextCampaignId().call();
            const activeCampaigns = [];
            const fulfilledCampaigns = [];
            const canceledCampaigns = [];

            for (let i = 0; i < campaignCount; i++) {
                const campaign = await crowdfunding.methods.campaigns(i).call();
                const userPledges = await crowdfunding.methods.getBackerShares(i, userAddress).call();

                const campaignData = {
                    campaignId: i,
                    entrepreneur: campaign.entrepreneur,
                    title: campaign.title,
                    pledgeCost: web3.utils.fromWei(campaign.pledgeCost, "ether"),
                    pledgesNeeded: campaign.pledgesNeeded,
                    pledgesCount: campaign.pledgesCount,
                    userPledges: userPledges,
                    fulfilled: campaign.fulfilled,
                    canceled: campaign.cancelled
                };

                if (!campaign.fulfilled && !campaign.cancelled) {
                    activeCampaigns.push(campaignData);
                } else if (campaign.fulfilled) {
                    fulfilledCampaigns.push(campaignData);
                } else if (campaign.cancelled) {
                    canceledCampaigns.push(campaignData);
                }
            }

            setCampaigns(activeCampaigns);
            setFulfilledCampaigns(fulfilledCampaigns);
            setCanceledCampaigns(canceledCampaigns);
        } catch (error) {
            console.error("❌ Error fetching campaigns:", error);
        }
    };

    // Function to pledge to a campaign
    const pledgeCampaign = async (campaignId, pledgeCost) => {
        try {
            await crowdfunding.methods.pledge(campaignId, 1).send({
                from: account,
                value: web3.utils.toWei(pledgeCost, "ether")
            });

            await loadCampaigns(account);
        } catch (error) {
            console.error("❌ Pledge Error:", error);
        }
    };

    // Function to cancel a campaign
    const cancelCampaign = async (campaignId) => {
        try {
            await crowdfunding.methods.cancelCampaign(campaignId).send({ from: account });
            await loadCampaigns(account);
        } catch (error) {
            console.error("❌ Cancel Error:", error);
        }
    };

    // Function to fulfill a campaign
    const fulfillCampaign = async (campaignId) => {
        try {
            await crowdfunding.methods.completeCampaign(campaignId).send({ from: account });
            await loadCampaigns(account);
        } catch (error) {
            console.error("❌ Fulfill Error:", error);
        }
    };

    // Function to withdraw fees (owner only)
    const withdrawFees = async () => {
        try {
            await crowdfunding.methods.withdrawFees().send({ from: account });
            await loadBlockchainData();
        } catch (error) {
            console.error("❌ Withdraw Fees Error:", error);
        }
    };

    // Function to change the contract owner (owner only)
    const changeOwner = async () => {
        try {
            await crowdfunding.methods.changeOwner(newOwnerAddress).send({ from: account });
            setContractOwner(newOwnerAddress);
        } catch (error) {
            console.error("❌ Change Owner Error:", error);
        }
    };

    // Function to ban an entrepreneur (owner only)
    const banEntrepreneur = async () => {
        try {
            await crowdfunding.methods.banUser(entrepreneurToBan).send({ from: account });
        } catch (error) {
            console.error("❌ Ban Entrepreneur Error:", error);
        }
    };

    // Function to destroy the contract (owner only)
    const destroyContract = async () => {
        try {
            await crowdfunding.methods.deactivateContract().send({ from: account });
        } catch (error) {
            console.error("❌ Destroy Contract Error:", error);
        }
    };

    // Function to refund an investor for a canceled campaign
    const refundInvestor = async (campaignId) => {
        try {
            await crowdfunding.methods.refundInvestor(campaignId).send({ from: account });
            await loadCampaigns(account);
        } catch (error) {
            console.error("❌ Refund Investor Error:", error);
        }
    };

    return (
        <div style={{ padding: "20px", fontFamily: "Arial" }}>
            <h1>Crowdfunding DApp</h1>

            {/* Top Section */}
            <div>
                <label><strong>Current Address</strong></label>
                <input type="text" value={account} readOnly style={{ width: "100%" }} />

                <label><strong>Owner's Address</strong></label>
                <input type="text" value={contractOwner} readOnly style={{ width: "100%" }} />

                <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                    <div>
                        <label><strong>Balance</strong></label>
                        <input type="text" value={balance + " ETH"} readOnly />
                    </div>
                    <div>
                        <label><strong>Collected fees</strong></label>
                        <input type="text" value={collectedFees + " ETH"} readOnly />
                    </div>
                </div>
            </div>

            {/* New Campaign Section */}
            <h2>Create Campaign</h2>
            <form onSubmit={createCampaign}>
                <div>
                    <label>Title</label>
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div>
                    <label>Pledge Cost (ETH)</label>
                    <input type="text" value={pledgeCost} onChange={(e) => setPledgeCost(e.target.value)} />
                </div>
                <div>
                    <label>Pledges Needed</label>
                    <input type="text" value={pledgesNeeded} onChange={(e) => setPledgesNeeded(e.target.value)} />
                </div>
                {account !== contractOwner && (
                    <button type="submit">Create Campaign</button>
                )}
            </form>
            {message && <p>{message}</p>}

            {/* Live Campaigns Section */}
            <h2>Live Campaigns</h2>
            <table border="1" cellPadding="5">
                <thead>
                    <tr>
                        <th>Entrepreneur</th>
                        <th>Title</th>
                        <th>Price / Backers / Pledges left / Your Pledges</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {campaigns.map((campaign) => (
                        <tr key={campaign.campaignId}>
                            <td>{campaign.entrepreneur}</td>
                            <td>{campaign.title}</td>
                            <td>
                                {campaign.pledgeCost} ETH | {campaign.pledgesCount} | {campaign.pledgesNeeded - campaign.pledgesCount} | {campaign.userPledges}
                            </td>
                            <td>
                                <button onClick={() => pledgeCampaign(campaign.campaignId, campaign.pledgeCost)}>Pledge</button>
                                {(account === campaign.entrepreneur || account === contractOwner) && (
                                    <>
                                        <button onClick={() => cancelCampaign(campaign.campaignId)}>Cancel</button>
                                        {campaign.pledgesCount >= campaign.pledgesNeeded && (
                                            <button onClick={() => fulfillCampaign(campaign.campaignId)}>Fulfill</button>
                                        )}
                                    </>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Fulfilled Campaigns Section */}
            <h2>Fulfilled Campaigns</h2>
            <table border="1" cellPadding="5">
                <thead>
                    <tr>
                        <th>Entrepreneur</th>
                        <th>Title</th>
                        <th>Price / Backers / Pledges left / Your Pledges</th>
                    </tr>
                </thead>
                <tbody>
                    {fulfilledCampaigns.map((campaign) => (
                        <tr key={campaign.campaignId}>
                            <td>{campaign.entrepreneur}</td>
                            <td>{campaign.title}</td>
                            <td>
                                {campaign.pledgeCost} ETH | {campaign.pledgesCount} | {campaign.pledgesNeeded - campaign.pledgesCount} | {campaign.userPledges}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Canceled Campaigns Section */}
            <h2>Canceled Campaigns</h2>
            <table border="1" cellPadding="5">
                <thead>
                    <tr>
                        <th>Entrepreneur</th>
                        <th>Title</th>
                        <th>Price / Backers / Pledges left / Your Pledges</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {canceledCampaigns.map((campaign) => (
                        <tr key={campaign.campaignId}>
                            <td>{campaign.entrepreneur}</td>
                            <td>{campaign.title}</td>
                            <td>
                                {campaign.pledgeCost} ETH | {campaign.pledgesCount} | {campaign.pledgesNeeded - campaign.pledgesCount} | {campaign.userPledges}
                            </td>
                            <td>
                                {campaign.userPledges > 0 && (
                                    <button onClick={() => refundInvestor(campaign.campaignId)}>Claim Refund</button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Control Panel (Owner Only) */}
            {account === contractOwner && (
                <div>
                    <h2>Control Panel (Owner Only)</h2>
                    <button onClick={withdrawFees}>Withdraw Fees</button>
                    <div>
                        <input
                            type="text"
                            placeholder="New Owner Address"
                            value={newOwnerAddress}
                            onChange={(e) => setNewOwnerAddress(e.target.value)}
                        />
                        <button onClick={changeOwner}>Change Owner</button>
                    </div>
                    <div>
                        <input
                            type="text"
                            placeholder="Entrepreneur to Ban"
                            value={entrepreneurToBan}
                            onChange={(e) => setEntrepreneurToBan(e.target.value)}
                        />
                        <button onClick={banEntrepreneur}>Ban Entrepreneur</button>
                    </div>
                    <button onClick={destroyContract}>Destroy Contract</button>
                </div>
            )}
        </div>
    );
}

export default App;

