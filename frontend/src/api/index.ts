import axios from 'axios';

import { API_URL } from '../consts';

type AxiosErrorType = {
  message: string;
  statusCode: number;
  statusString: string;
};

type MigrationRequest = {
  handle: string;
  email: string;
};

/* response which's returned by this method */
type MigrationResponse = {
  error: boolean;
  errorName?: string;
  message: string;
};

/* API response for success */
type APIResponseSuccess = {
  session_id: string;
};

/* formatted API errors are wrapped in this */
type APIFormattedError = {
  error: string;
  details: string;
};

/* unformatted API error (plain FastAPI's HTTPException) */
type APIUnformattedError = {
  detail: string;
}

async function submitMigrationRequest(handle: string, email: string, signal: AbortSignal ): Promise<MigrationResponse> {
  const request: MigrationRequest = {
    handle: handle,
    email: email,
  }

  try {
    const { data, status } = await axios.post<APIResponseSuccess>(
      API_URL,
      request,
      {
        signal: signal,
        headers: {
          Accept: 'application/json',
        },
      },
    );

    if (data === null || data.session_id === undefined) {
      return {
        error: true,
        errorName: "Server Error",
        message: "Server has returned malformed response.",
      }
    }

    return {
      error: false,
      message: data.session_id,
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const typedError: AxiosErrorType = {
        message: error.message,
        statusCode: error.response?.status || 500,
        statusString: error.response?.statusText || "Unknown",
      };

      /* most likely CORS-related */
      if (error.code === "ERR_NETWORK") {
        return {
          error: true,
          errorName: error.message,
          message: "Unknown network error has occured."
        }
      } else {
        /* backend has returned a formatted error; try to extract additional fields */
        const errorResponse = error.response?.data;
        const isFormattedError = errorResponse.error !== undefined && errorResponse.details !== undefined;
        const isUnformattedError = errorResponse.detail !== undefined;

        /* formatted error -> unformatted error -> generic HTTP error */
        return {
          error: true,
          errorName: isFormattedError ? errorResponse.error : typedError.statusString,
          message: isFormattedError ? errorResponse.details : (isUnformattedError ? errorResponse.detail : "Unknown API error.")
        }
      }
    } else {
      return {
        error: true,
        errorName: "Unknown Error",
        message: error as string,
      }
    }
  }
}

export { submitMigrationRequest }
export type { MigrationRequest, MigrationResponse }