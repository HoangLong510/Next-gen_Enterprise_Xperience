import { useState } from "react";
import { createNotification } from "~/services/notification.service";
import { useSelector } from "react-redux";

function NotificationsPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [recipient, setRecipient] = useState("");
  const account = useSelector((state) => state.account.value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !content || !recipient) {
      alert("Please fill in all fields");
      return;
    }

    const data = { title, content, recipient };
    console.log(">>> account", account);
    console.log(">>> accessToken", account?.accessToken);
    const res = await createNotification(data, account?.accessToken);
    console.log(">>> response: ", res);

    alert(res.message);
  };

  return (
    <div className="container">
      <h2>Create Notification</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Title:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label>Content:</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
          ></textarea>
        </div>
        <div>
          <label>Recipient (username):</label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
        </div>
        <button type="submit">Send Notification</button>
      </form>
    </div>
  );
}

export default NotificationsPage;
