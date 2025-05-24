const { Client, environments } = require("square");
require("dotenv").config();

export const squareClient = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: environments.sandbox,
});

async function getLocations() {
  try {
    const response = await squareClient.locationsApi.listLocations();
    const locations = response.result.locations;

    if (locations && locations.length > 0) {
      locations.forEach(
        (location: {
          id: any;
          name: any;
          address: { addressLine1: any; locality: any };
        }) => {
          console.log(
            `${location.id}: ${location.name}, ${location.address?.addressLine1}, ${location.address?.locality}`
          );
        }
      );
    } else {
      console.log("No locations found.");
    }
  } catch (error) {
    console.error("Error fetching locations:", error);
  }
}

getLocations();
