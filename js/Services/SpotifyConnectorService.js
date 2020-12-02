class SpotifyConnectorService {

	#isReady = false;
	#config;
	#accessToken = new AccessToken();

	get isReady() {
		return this.#isReady;
	}

	constructor() {
		this.#config = Config.getInstance();
		this.#config.onConfigChanged = (_) => {
			if(this.#config.hasConfigOption('txt_spotify_refresh_token')) {
				this.#accessToken.refreshToken = this.#config.getConfigOption('txt_spotify_refresh_token');
				this.authorise();
			}
		}
	}

	/**
	 * Get a new access token
	 *
	 * @return {Promise<undefined>|Promise<undefined>}
	 */
	authorise() {
		if(this.#accessToken && !this.#accessToken.hasExpired()) {
			return new Promise(r => r());
		}

		this.#isReady = false;

		const requestOptions = {
			method: 'POST',
			headers: this.getHeaders(),
			body: this.getAuthBody(),
			redirect: 'follow'
		};

		return fetch('https://accounts.spotify.com/api/token', requestOptions)
			.then(response => response.json())
			.then(result => {
				this.#accessToken.accessToken = result.access_token;
				this.#accessToken.expiresIn = result.expires_in;

			})
			.catch(error => {
				console.log('error', error)
			} );
	}

	/**
	 * Gets the currently playing song data from spotify
	 *
	 * @return {Promise<string>} The response data in JSON format
	 */
	getCurrentlyPlaying() {

		return new Promise((resolve, reject) => {
			this.authorise().then(() => {
				const requestOptions = {
					method: 'GET',
					headers: this.getHeaders(),
					// body: this.getAuthBody(),
					redirect: 'follow'
				};

				fetch('https://api.spotify.com/v1/me/player/currently-playing?market=ES', requestOptions)
					.then(response => {
						response.json().then(json => resolve(json)).catch(e => reject(e));
					});
			});
		});
	}

	/**
	 * Gets the Bearer token header if the access token is valid, or the Basic header if the access token is not valid
	 * @return {string}
	 */
	getAuthToken() {
		if(this.#accessToken && !this.#accessToken.hasExpired()) {
			return `Bearer ${this.#accessToken.accessToken}`;
		}

		return `Basic ${btoa(`${this.#config.getConfigOption('clientid')}:${this.#config.getConfigOption('clientsecret')}`)}`;
	}

	/**
	 * Get all the relevant headers for Spotify
	 *
	 * @return {Headers}
	 */
	getHeaders() {
		const headers = new Headers();
		headers.append("Authorization", this.getAuthToken());
		headers.append("Accept", 'application/json');
		headers.append("Content-Type", "application/x-www-form-urlencoded");

		return headers;
	}

	/**
	 * Get the JSON body for spotify Auth
	 *
	 * @return {URLSearchParams}
	 */
	getAuthBody() {
		return this.buildBody({
			refresh_token: this.#accessToken.refreshToken,
			grant_type: 'refresh_token'
		});
	}

	/**
	 * @param data An object with data {key: value, scope: 'user-read-playback-state'}
	 * @return {URLSearchParams} The body for the fetch function
	 */
	buildBody(data) {
		const params = new URLSearchParams();

		for(const key in data) {
			params.append(key, data[key]);
		}

		return params;
	}
}
