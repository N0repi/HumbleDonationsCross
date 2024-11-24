// AggregatedDonationsComponent.jsx
import React from "react";
import { GET_RECENT_DONATIONS } from "../graphReactNOC";
import { useAggregatedProjects } from "./useAggregatedProjects";

const AggregatedDonationsComponent = () => {
  const { data, loading, error } = useAggregatedProjects(GET_RECENT_DONATIONS);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      {data.donations.map((donation) => (
        <div key={donation.id}>
          <p>Donor: {donation.donor}</p>
          <p>Amount: {donation.amount}</p>
          <p>Project: {donation.project.projectTitle}</p>
        </div>
      ))}
    </div>
  );
};

export default AggregatedDonationsComponent;
