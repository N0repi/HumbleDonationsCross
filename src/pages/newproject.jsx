// newproject.jsx

import Head from "next/head";
import CreateForm from "../Components/forms/CreateForm";
import pageStyles from "./newproject.module.css";

export default function CreateProject() {
  return (
    <>
      <Head>
        <title>Create a New Project - HumbleDonations</title>
        <meta
          name="description"
          content="Create a new project on HumbleDonations to share your ideas and receive support from the community. Easily add project details and launch."
        />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="HumbleDonations Team" />
        <link rel="canonical" href="https://humbledonations.com/newproject" />
        <meta
          property="og:title"
          content="Create a New Project - HumbleDonations"
        />
        <meta
          property="og:description"
          content="Create a new project on HumbleDonations to share your ideas and receive support from the community."
        />
        <meta
          property="og:url"
          content="https://humbledonations.com/newproject"
        />
        <meta
          property="og:image"
          content="https://humbledonations.com/HDT.png"
        />{" "}
        {/* Replace with a default image for creating projects */}
        <meta
          name="twitter:card"
          content="https://humbledonations.com/HDT.png"
        />
        <meta
          name="twitter:title"
          content="Create a New Project - HumbleDonations"
        />
        <meta
          name="twitter:description"
          content="Create a new project on HumbleDonations to share your ideas and receive support from the community."
        />
        <meta
          name="twitter:image"
          content="https://humbledonations.com/HDT.png"
        />
      </Head>
      <main className={pageStyles.main}>
        <h1 className={pageStyles.pageTitle}>Add new project</h1>
        <CreateForm />
      </main>
    </>
  );
}
