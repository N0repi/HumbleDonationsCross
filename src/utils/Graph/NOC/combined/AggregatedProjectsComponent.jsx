// AggregatedProjectsComponent.jsx

import React from "react";
import { GET_PROJECTS } from "../graphReactNOC";
import { useAggregatedProjects } from "./useAggregatedProjects";

const AggregatedProjectsComponent = () => {
  const { data, loading, error } = useAggregatedProjects(GET_PROJECTS);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      {data.projects.map((project) => (
        <div key={project.id}>
          <h3>{project.projectTitle}</h3>
          <p>Owner: {project.owner}</p>
          <p>Created At: {project.createdAt}</p>
        </div>
      ))}
    </div>
  );
};

export default AggregatedProjectsComponent;
