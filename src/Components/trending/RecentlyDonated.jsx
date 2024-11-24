// RecentlyDonated.jsx

import React from "react";
import { useQuery } from "urql";
import { Provider } from "urql";
import Link from "next/link";
import { GET_RECENT_DONATIONS } from "../../utils/Graph/NOC/graphReactNOC.jsx";
import Style from "./Trending.module.css";
import { useWallet } from "../../Components/Wallet/WalletContext.jsx";
import { getConfig } from "../../utils/constants";

const RecentDonations = () => {
  const [result] = useQuery({ query: GET_RECENT_DONATIONS });
  const { data, fetching, error } = result;

  if (fetching) return <p>Loading...</p>;
  if (error) return <p>RecentlyDonated Error: {error.message}</p>;

  const uniqueProjects = new Set();

  // Filter donations to only include unique projects
  const uniqueDonations = data.donations.filter((donation) => {
    if (uniqueProjects.has(donation.project.id)) {
      return false;
    } else {
      uniqueProjects.add(donation.project.id);
      return true;
    }
  });

  return (
    <div className={Style.scrollContainer}>
      <div className={Style.gridLayout}>
        {uniqueDonations.map((donation) => {
          let projectData;
          try {
            projectData = JSON.parse(donation.project.uri);
          } catch (e) {
            console.error("Failed to parse project URI:", e);
            projectData = { body: donation.project.uri, tag: [] };
          }

          return (
            <Link
              href={`/projects/${donation.project.projectTitle}`}
              key={donation.id}
            >
              <div className={Style.projectBox}>
                <h3 className={Style.titleStyle}>
                  {donation.project.projectTitle}
                </h3>
                <p className={Style.projectDescription}>
                  {projectData.body
                    ? projectData.body.slice(0, 200)
                    : donation.project.uri.slice(0, 200)}
                  ...
                </p>
                <div className={Style.tagContainer}>
                  {Array.isArray(projectData.tag) &&
                    projectData.tag.map((tag, index) => {
                      const formattedTag = tag.replace(/\s+/g, "-"); // Ensure the tag format matches the CSS class name
                      return (
                        <div
                          key={index}
                          className={`${Style.tag} ${Style[formattedTag]}`} // Add dynamic class
                        >
                          {tag}
                        </div>
                      );
                    })}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

const WrappedRecentDonations = (props) => {
  const { chain } = useWallet();
  const chainId = chain?.id;

  // Dynamically get the urqlClient for the specified chainId
  // if (!chainId){}
  // const { urqlClient } = getConfig(chainId);

  // if (!urqlClient) {
  //   console.error(`No urqlClient found for chainId: ${chainId}`);
  //   return <p>Client configuration error. Please check your setup.</p>;
  // }

  // const { chainId } = props;

  // Dynamically get the urqlClient for the specified chainId
  const { urqlClient } = getConfig(chainId);

  if (!urqlClient) {
    console.error(`No urqlClient found for chainId: ${chainId}`);
    return <p>Client configuration error. Please check your setup.</p>;
  }

  console.log("Using urqlClient for chainId:", chainId);

  return (
    <Provider value={urqlClient}>
      <RecentDonations {...props} />
    </Provider>
  );
};

export default WrappedRecentDonations;
