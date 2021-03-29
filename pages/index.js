import React, { useState } from "react";

// our landmark Factory deployed on Rinkeby
import landmarkFactory from "../ethereum/landmarkFactory";
import Layout from "../components/Layout";

// next.js imports
import dynamic from "next/dynamic";

// load the map component without SSR
const Map = dynamic(() => import("../components/Map"), {
  loading: () => "Loading...",
  ssr: false,
});

const Page = ({ landmarks }) => {
  return (
    <Layout>
      <Map landmarks={landmarks} />
    </Layout>
  );
};

export default Page;

// call landmarks from our contract first and inject it into our page
export async function getServerSideProps() {
  const landmarks = await landmarkFactory.methods.landmarks().call();
  return { props: { landmarks } };
}
