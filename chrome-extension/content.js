console.log("Email Assistant is running");

const BUTTON_ID = "mailcraft-generate-btn";

let scanTimeout = null;
function scheduleScan() {
  clearTimeout(scanTimeout);
  scanTimeout = setTimeout(injectButtonIntoToolbars, 150);
}

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    const addedNodes = Array.from(mutation.addedNodes);
    const hasComposeElements = addedNodes.some(node =>
      node.nodeType === Node.ELEMENT_NODE &&
      (node.matches('.aDh, .btC, [role="dialog"]') ||
       node.querySelector('.aDh, .btC, [role="dialog"]'))
    );

    if (hasComposeElements) {
      console.log("Compose elements detected");
      scheduleScan();
      break;
    }
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

scheduleScan();

function injectButtonIntoToolbars() {
  const toolbars = document.querySelectorAll(".btC");

  toolbars.forEach((toolbar) => {
    if (toolbar.querySelector(`#${BUTTON_ID}`)) return;

    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.className = "mailcraft-btn";
    button.innerHTML = "✨ Generate Reply";

    button.addEventListener("click", async () => {
      await onGenerateClick(toolbar, button);
    });

    toolbar.appendChild(button);
  });
}

function getEmailContent() {
  const selectors = [
    '.a3s.aiL',
    '.h7',
    '.gmail_quote',
    '[role="presentation"]'
  ];

  for (const selector of selectors) {
    const content = document.querySelector(selector);
    if (content) {
      return content.innerText.trim();
    }
  }
  return null;
}

function insertReplyIntoComposeBox(generatedReply) {
  const composeBox = document.querySelector(
    '[role="textbox"][g_editable="true"]'
  );

  if (composeBox) {
    composeBox.focus();
    document.execCommand('insertText', false, generatedReply);
    return true;
  }

  console.warn("MailCraft: could not find compose box to insert reply into");
  return false;
}

async function onGenerateClick(toolbar, button) {
  const originalLabel = button.innerHTML;

  try {
    button.innerHTML = "Generating...";
    button.disabled = true;

    const emailContent = getEmailContent();

    if (!emailContent) {
      console.warn("MailCraft: could not find email content to reply to");
      button.innerHTML = "No email found";
      setTimeout(() => (button.innerHTML = originalLabel), 2000);
      return;
    }

    const response = await fetch('http://localhost:8080/api/email/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        emailContent: emailContent,
        tone: "professional"
      })
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const generatedReply = await response.text();
    console.log("Generated reply:", generatedReply);

    const inserted = insertReplyIntoComposeBox(generatedReply);
    if (!inserted) {
      button.innerHTML = "Reply ready (compose box not found)";
      setTimeout(() => (button.innerHTML = originalLabel), 2500);
      return;
    }

  } catch (err) {
    console.error("MailCraft: failed to generate reply", err);
    button.innerHTML = "Error - retry";
    setTimeout(() => (button.innerHTML = originalLabel), 2000);
    return;
  } finally {
    button.disabled = false;
  }

  button.innerHTML = originalLabel;
}