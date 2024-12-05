// ProjectList4.js

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery, useClient, Provider } from "urql";
import { GET_PROJECTS_MINIMAL } from "../../utils/Graph/NOC/graphReactNOC.jsx";
import Style from "./ProjectList4.module.css";
import { useWallet } from "../../Components/Wallet/WalletContext.jsx";
import { getConfig } from "../../utils/constants";

function ProjectsList({ searchQuery, selectedTags, sortByNewest }) {
  const [projects, setProjects] = useState([]);
  const urqlClient = useClient(); // Get the urql client to execute a manual re-fetch

  const [{ data, fetching, error, operation }] = useQuery({
    query: GET_PROJECTS_MINIMAL,
  });

  // Consolidate cache vs. network logs to ensure they only appear once
  useEffect(() => {
    if (operation?.context?.meta?.cacheOutcome === "hit") {
      console.log("Data loaded from cache");
    } else if (operation?.context?.meta?.cacheOutcome === "miss") {
      console.log("Data fetched from network");
    }
  }, [operation]);

  useEffect(() => {
    if (data) {
      const fetchedProjects = data.projects.map((project) => {
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
        };
      });

      // Default sort behavior - oldest to newest
      if (sortByNewest) {
        fetchedProjects.reverse();
      }

      setProjects(fetchedProjects);
    }
  }, [data, sortByNewest]);

  // Manual re-fetch logic when a new project is added
  useEffect(() => {
    const newProjectAdded = localStorage.getItem("newProjectAdded");
    if (newProjectAdded === "true") {
      urqlClient
        .executeQuery({ query: GET_PROJECTS_MINIMAL })
        .toPromise()
        .then((result) => {
          if (result.data) {
            const fetchedProjects = result.data.projects.map((project) => {
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
              };
            });

            if (sortByNewest) {
              fetchedProjects.reverse();
            }

            setProjects(fetchedProjects);
          }
        });

      localStorage.removeItem("newProjectAdded"); // Remove the flag after handling it
    }
  }, [urqlClient, sortByNewest]);

  if (fetching) return <p>Loading...</p>;
  if (error) return <p>Oh no... {error.message}</p>;

  // Filtering logic to filter Projects by multiple selected tags
  const filteredProjects = projects
    .filter((project) =>
      project.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    // If no tags are selected, show all projects
    .filter((project) => {
      if (selectedTags.length === 0) return true;
      // Check if the project has at least one of the selected tags
      return (
        Array.isArray(project.tag) &&
        selectedTags.some((tag) => project.tag.includes(tag))
      );
    });
  let totalTagWidth = 0;

  return (
    <div className={Style.gridLayout}>
      {filteredProjects.map((project) => (
        <Link href={"/projects/" + project.title} key={project.title}>
          <div className={`${Style.projectBox} ${Style.glassBackground}`}>
            <h3 className={Style.titleStyle}>{project.title}</h3>
            <p className={Style.bodyStyle}>{project.body.slice(0, 200)}...</p>
            <div className={Style.tagContainer}>
              {Array.isArray(project.tag) &&
                project.tag.map((tag, index) => {
                  const formattedTag = tag.replace(/\s+/g, "-");
                  const marginLeft = index > 0 ? totalTagWidth + index * 1 : 0;

                  return (
                    <div
                      key={index}
                      className={`${Style.tag} ${Style[formattedTag]}`}
                      style={{ marginLeft }}
                    >
                      {tag}
                    </div>
                  );
                })}

              {Array.isArray(project.tag) && (
                <div
                  className={Style.tagPlaceholder}
                  style={{ width: totalTagWidth }}
                />
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

const WrappedProjectsList = (props) => {
  const { chain } = useWallet();
  const chainId = chain?.id; // chain?.id;
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
      <ProjectsList {...props} />
    </Provider>
  );
};

export default WrappedProjectsList;
