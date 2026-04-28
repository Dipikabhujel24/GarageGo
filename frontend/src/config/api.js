export const API_BASE = "http://localhost:5072";

export const apiUrl = (path) => {
	if (!path) {
		return API_BASE;
	}

	return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
};

export const readApiResponse = async (response) => {
	const rawText = await response.text();

	if (!rawText) {
		return {};
	}

	try {
		return JSON.parse(rawText);
	} catch {
		return { message: rawText };
	}
};

export const getApiErrorMessage = (data, fallbackMessage) => {
	if (!data) {
		return fallbackMessage;
	}

	if (typeof data === "string") {
		return data;
	}

	return data.message || data.title || fallbackMessage;
};

export const logApiResponse = (label, response, data) => {
	console.log(`[API] ${label}`, {
		status: response.status,
		ok: response.ok,
		data
	});
};
