import Keycloak from "keycloak-js";
import { env } from "@/lib/env";
import { createLogger } from "@/lib/logger";

const logger = createLogger("keycloak");

const keycloak = new Keycloak({
  url: env.keycloakUrl,
  realm: env.keycloakRealm,
  clientId: env.keycloakClientId,
});

export const initKeycloak = async (): Promise<boolean> => {
  try {
    logger.info("Loading Keycloak");
    const authenticated = await keycloak.init({
      onLoad: "login-required",
    });

    if (authenticated) {
      logger.info("User is authenticated");
    } else {
      logger.info("User is not authenticated");
    }

    return authenticated;
  } catch (error: unknown) {
    logger.error("Failed to initialize adapter", error instanceof Error ? error : String(error));
    return false;
  }
};

export default keycloak;
