import axios from 'axios';

import { API_BASE } from '../consts';

type AxiosErrorType = {
  message: string;
  statusCode: number;
  statusString: string;
};

type MigrationRequest = {
  handle: string;
  email: string;
  branch: string;
};

/* response which's returned by this method */
type MigrationSuccessResponse = {
  repo: string;
  expires: number;
}

type MigrationErrorResponse = {
  error: string;
  details: string;
}

/* API response for success */
type APIResponseSuccess = {
  repo_id: string;
  repo_ttl: number;
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

async function submitMigrationRequest(handle: string, email: string, branch: string, signal: AbortSignal):
  Promise<MigrationSuccessResponse> {
    return new Promise(async (resolve, reject) => {
      const request: MigrationRequest = {
        handle: handle,
        email: email,
        branch: branch,
      }

      try {
        const { data, status } = await axios.post<APIResponseSuccess>(
          `${API_BASE}/migrate`,
          request,
          {
            signal: signal,
            headers: {
              Accept: 'application/json',
            },
          },
        );

        if (data === null || data.repo_id === undefined) {
          reject({
            error: "Server Error",
            details: "Server has returned malformed response.",
          })
        }

        resolve({
          repo: data.repo_id,
          expires: data.repo_ttl,
        })
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const typedError: AxiosErrorType = {
            message: error.message,
            statusCode: error.response?.status || 500,
            statusString: error.response?.statusText || "Unknown",
          };

          /* most likely CORS-related */
          if (error.code === "ERR_NETWORK") {
            reject({
              error: error.message,
              details: "Unknown network error has occured."
            });
          } else {
            /* backend has returned a formatted error; try to extract additional fields */
            const errorResponse = error.response?.data;
            const isFormattedError = errorResponse.error !== undefined && errorResponse.details !== undefined;
            const isUnformattedError = errorResponse.detail !== undefined;

            /* formatted error -> unformatted error -> generic HTTP error */
            reject({
              error: isFormattedError ? errorResponse.error : typedError.statusString,
              details: isFormattedError ? errorResponse.details : (isUnformattedError ? errorResponse.detail : "Unknown API error.")
            });
          }
        } else {
          reject({
            error: "Unknown Error",
            details: error as string,
          });
        }
      }
    });
}

export { submitMigrationRequest }
export type { MigrationRequest, MigrationSuccessResponse, MigrationErrorResponse }