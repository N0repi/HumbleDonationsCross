// ProjectList4.js

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery, useClient, Provider } from "urql";
import { GET_PROJECTS_MINIMAL } from "../../utils/Graph/NOC/graphReactNOC.jsx";
import Style from "./ProjectList4.module.css";
import { useWallet } from "../../Components/Wallet/WalletContext.jsx";
import { getConfig } from "../../utils/constants";
import { fetchFromBothSubgraphs } from "../../utils/Graph/NOC/combined/fetchDataFromSubgraphs.js";

// ProjectList4.js

function ProjectsList({
  sortByAll,
  searchQuery,
  selectedTags,
  sortByNewest,
  sortByArbitrum,
  sortBySonic,
  chainId,
}) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { urqlClient } = getConfig(chainId);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      let fetchedProjects = [];

      try {
        if (sortByAll) {
          // Fetch from both subgraphs when "All" is selected
          const results = await fetchFromBothSubgraphs(GET_PROJECTS_MINIMAL);
          fetchedProjects = results.map((project) => {
            let projectData;
            try {
              projectData = JSON.parse(project.uri);
            } catch (error) {
              console.error("Failed to parse project URI JSON:", error);
              projectData = {
                title: project.projectTitle,
                body: project.uri,
                tag: [],
              };
            }

            return {
              title: projectData.title,
              body: projectData.body,
              tag: projectData.tag,
              network: project.network.toLowerCase(),
            };
          });
        } else if (sortByArbitrum) {
          // Fetch only from the Arbitrum subgraph
          const { urqlClient: arbitrumClient } = getConfig(42161); // Arbitrum chainId
          const result = await arbitrumClient
            .query(GET_PROJECTS_MINIMAL, {})
            .toPromise();
          if (result.error) throw result.error;

          fetchedProjects = result.data.projects.map((project) => {
            let projectData;
            try {
              projectData = JSON.parse(project.uri);
            } catch (error) {
              console.error("Failed to parse project URI JSON:", error);
              projectData = {
                title: project.projectTitle,
                body: project.uri,
                tag: [],
              };
            }

            return {
              title: projectData.title,
              body: projectData.body,
              tag: projectData.tag,
              network: "arbitrum",
            };
          });
        } else if (sortBySonic) {
          // Fetch only from the Sonic subgraph
          const { urqlClient: sonicClient } = getConfig(146); // Sonic chainId
          const result = await sonicClient
            .query(GET_PROJECTS_MINIMAL, {})
            .toPromise();
          if (result.error) throw result.error;

          fetchedProjects = result.data.projects.map((project) => {
            let projectData;
            try {
              projectData = JSON.parse(project.uri);
            } catch (error) {
              console.error("Failed to parse project URI JSON:", error);
              projectData = {
                title: project.projectTitle,
                body: project.uri,
                tag: [],
              };
            }

            return {
              title: projectData.title,
              body: projectData.body,
              tag: projectData.tag,
              network: "sonic",
            };
          });
        } else if (urqlClient) {
          // Default fetch using the specified chain's urqlClient
          const result = await urqlClient
            .query(GET_PROJECTS_MINIMAL, {})
            .toPromise();
          if (result.error) throw result.error;

          fetchedProjects = result.data.projects.map((project) => {
            let projectData;
            try {
              projectData = JSON.parse(project.uri);
            } catch (error) {
              console.error("Failed to parse project URI JSON:", error);
              projectData = {
                title: project.projectTitle,
                body: project.uri,
                tag: [],
              };
            }

            return {
              title: projectData.title,
              body: projectData.body,
              tag: projectData.tag,
              network:
                chainId === 42161
                  ? "arbitrum"
                  : chainId === 146
                  ? "sonic"
                  : "unknown",
            };
          });
        }

        // Sort by newest if specified
        if (sortByNewest) {
          fetchedProjects.reverse();
        }

        setProjects(fetchedProjects);
      } catch (fetchError) {
        console.error("Error fetching projects:", fetchError);
        setError(fetchError);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [
    urqlClient,
    chainId,
    sortByAll,
    sortByNewest,
    sortByArbitrum,
    sortBySonic,
  ]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Oh no... {error.message}</p>;

  // Filtering logic for search query and tags
  const filteredProjects = projects
    .filter((project) =>
      project.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter((project) => {
      if (selectedTags.length === 0) return true;
      return (
        Array.isArray(project.tag) &&
        selectedTags.some((tag) => project.tag.includes(tag))
      );
    });

  return (
    <div className={Style.gridLayout}>
      {filteredProjects.map((project) => (
        <Link href={"/projects/" + project.title} key={project.title}>
          <div className={`${Style.projectBox} ${Style.glassBackground}`}>
            <h3 className={Style.titleStyle}>{project.title}</h3>
            <p className={Style.bodyStyle}>{project.body.slice(0, 200)}...</p>
            <p className={Style.networkStyle}>Network: {project.network}</p>
            <div className={Style.tagContainer}>
              {Array.isArray(project.tag) &&
                project.tag.map((tag, index) => {
                  const formattedTag = tag.replace(/\s+/g, "-");
                  return (
                    <div
                      key={index}
                      className={`${Style.tag} ${Style[formattedTag]}`}
                    >
                      {tag}
                    </div>
                  );
                })}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

const WrappedProjectsList = (props) => {
  const { chain } = useWallet();
  const chainId = chain?.id;

  return <ProjectsList {...props} chainId={chainId} />;
};

export default WrappedProjectsList;
