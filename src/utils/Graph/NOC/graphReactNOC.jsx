// graphReactNOC.jsx
import { gql } from "@urql/core";

// Fragments
const ProjectFields = gql`
  fragment ProjectFields on Project {
    id
    projectTitle
    uri
  }
`;

const DonationFields = gql`
  fragment DonationFields on Donation {
    id
    erc20Token
    amount
  }
`;

// Main query for rendering
export const GET_PROJECTS_MINIMAL = gql`
  query GetProjectsMinimal {
    projects(
      where: { isDeleted: false }
      orderBy: createdAt
      orderDirection: asc
    ) {
      ...ProjectFields
      network
    }
  }
  ${ProjectFields}
`;

// For Referral
export const GET_PROJECTS_REFERRAL_ALL = gql`
  query GetProjectsMinimal {
    projects(
      where: { isDeleted: false }
      orderBy: createdAt
      orderDirection: asc
    ) {
      ...ProjectFields
      owner
    }
  }
  ${ProjectFields}
`;

// Specific to single referral code
// referralCode cannot be nested in uri needs to be
/*export const GET_PROJECTS_REFERRAL_SPECIFIC = gql`
  query GetProjectByReferralCode($referralCode: String!) {
    projects(
      where: { referralCode: $referralCode, isDeleted: false }
      orderBy: createdAt
      orderDirection: desc
    ) {
      ...ProjectFields
      owner
    }
  }
  ${ProjectFields}
`;*/
export const GET_PROJECTS_REFERRAL_SPECIFIC = gql`
  query GetProjectByReferralCode {
    projects(
      where: { isDeleted: false }
      orderBy: createdAt
      orderDirection: asc
    ) {
      ...ProjectFields
      owner
    }
  }
  ${ProjectFields}
`;

// Airdrop
export const GET_AIRDROP = gql`
  query GetProjects {
    projects(where: { isDeleted: false }) {
      id
      owner
      timestamp
      donations {
        id
        erc20Token
        donor
        erc20Token
        timestamp
      }
    }
  }
`;

// Projects
export const GET_PROJECTS = gql`
  query GetProjects {
    projects(where: { isDeleted: false }) {
      ...ProjectFields
      owner
      createdAt
      donations {
        ...DonationFields
        donor
        timestamp
      }
    }
  }
  ${ProjectFields}
  ${DonationFields}
`;

export const GET_DONATIONS_BY_PROJECT = gql`
  query GetDonationsByProject($projectId: String!) {
    donations(where: { project: $projectId }) {
      ...DonationFields
    }
  }
  ${DonationFields}
`;

// Trending
// Query to get the 8 most recent donations along with project details
export const GET_RECENT_DONATIONS = gql`
  query GetRecentDonations {
    donations(orderBy: timestamp, orderDirection: desc, first: 8) {
      ...DonationFields
      timestamp
      project {
        ...ProjectFields
      }
    }
  }
  ${ProjectFields}
  ${DonationFields}
`;
