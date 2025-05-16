import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
    url: "/",
    realm: "dev",
    clientId: "bff-local-dev",
});

try {
    const authenticated = await keycloak.init({
        onLoad: 'login-required',
        flow: 'implicit',

    }).then((authenticated) => {
        if (authenticated) {
            console.log('User is authenticated');
        } else {
            console.log('User is not authenticated');
        }
        if (keycloak.token) {
            localStorage.setItem('token', keycloak.token);
        }
    });
} catch (error) {
    console.error('Failed to initialize adapter:', error);
}
export default keycloak;