import React from "react";
import { useState, useEffect } from "react";
import { GoogleLogin } from "react-google-login";
import { gapi } from "gapi-script";
import axios from "axios";

const config = {
  clientId:
    "your client id",
  redirectUrl: "http://localhost:3000",
  scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
};
const GoogleOAuth = () => {
  const [userEmail, setUserEmail] = useState(null);
  const [accessToken, setAccessToken] = useState("");
  const [emails, setEmails] = useState([]);
  const [emailFilters, setEmailFilters] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [serachterm, setSearchterm] = useState("");

  const responseGoogle = async (response) => {
    console.log(response);

    if (response.profileObj) {
      // Access the email address from the profile
      const email = response.profileObj.email;
      console.log("User email:", email);

      // Store the email address in the state variable
      setUserEmail(email);
    }
    // Handle the response, usually you'll send it to your server for authentication
    try {
      const { accessToken } = response;

      // Store the access token in state
      setAccessToken(accessToken);
      setLoading(true);

      // Use the access token to fetch Gmail messages
      const apiUrlMessages =
        "https://www.googleapis.com/gmail/v1/users/me/messages";
      const headersMessages = {
        Authorization: `Bearer ${accessToken}`,
      };

      const responseMessages = await axios.get(apiUrlMessages, {
        headers: headersMessages,
      });
      const messages = responseMessages.data.messages || [];

      // Fetch details for each email
      const emailPromises = messages.map(async (message) => {
        const apiUrlMessage = `https://www.googleapis.com/gmail/v1/users/me/messages/${message.id}`;
        const responseMessage = await axios.get(apiUrlMessage, {
          headers: headersMessages,
        });

        const { snippet, payload } = responseMessage.data;
        const subject = payload.headers.find(
          (header) => header.name === "Subject"
        ).value;
        const sender = payload.headers.find(
          (header) => header.name === "From"
        ).value;
        const date = new Date(
          payload.headers.find((header) => header.name === "Date").value
        ).toLocaleString();

        return { subject, sender, snippet, date };
      });

      const filteredEmails = (await Promise.all(emailPromises)).filter(
        (email) => email !== null
      );
      setEmails(filteredEmails);
      setEmailFilters(filteredEmails);

      console.log("Filtered Emails:", filteredEmails);
    } catch (error) {
      setError("Error fetching data: " + error.message);
    } finally {
      setLoading(false);
    }
  };
  const handleLogout = () => {
    setAccessToken("");
    setEmails([]);
  };
  const filterEmails = () => {
    if (serachterm) {
      const filter = emails.filter((x) => {
        return x.sender.includes(serachterm);
      });
      setEmailFilters(filter);
      console.log(filter);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line no-undef

    gapi.load("client:auth2", () => {
      gapi.auth2.init({ clientId: config.clientId });
    });
  }, []);

  return (
    <div>
      {userEmail && <p>User Email: {userEmail}</p>}
      {accessToken ? (
        <div>
          <button onClick={handleLogout}>Log Out</button>
          <p>Access Token: {accessToken}</p>
          {loading && <p>Loading...</p>}
          <input
            type="text"
            placeholder="Search emails"
            value={serachterm}
            onChange={(e) => {
              console.log(e.target.value);
              setSearchterm(e.target.value);
              filterEmails();
            }}
          />
          {console.log(emailFilters, "emailFilters")}
          {emails.length > 0 && (
            <>
              <p>Emails:</p>

              <table>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Sender</th>
                    <th>Date</th>
                    <th>Body</th>
                  </tr>
                </thead>
                <tbody>
                  {!serachterm &&
                    emails?.map((email, index) => (
                      <tr key={index}>
                        <td>{email.subject}</td>
                        <td>{email.sender}</td>
                        <td>{email.date}</td>
                        <td>{email.snippet}</td>
                      </tr>
                    ))}

                  {serachterm &&
                    emailFilters?.map((email, index) => (
                      <tr key={index}>
                        <td>{email.subject}</td>
                        <td>{email.sender}</td>
                        <td>{email.date}</td>
                        <td>{email.snippet}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      ) : (
        <GoogleLogin
          clientId={config.clientId}
          buttonText="Login with Google"
          onSuccess={responseGoogle}
          onFailure={responseGoogle}
          cookiePolicy={"single_host_origin"}
        />
      )}
    </div>
  );
};

export default GoogleOAuth;
