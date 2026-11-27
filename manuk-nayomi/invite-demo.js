/* Manuk & Nayomi personalised invitation PREVIEW.
 * Public static demo only. These guests and PINs are entirely fictitious.
 * PINs below ARE NOT AUTHENTICATION. Never add actual guests or private codes
 * to this file. Real invites need a server-verified token/PIN, throttling,
 * private invite and RSVP storage, and authorised spreadsheet export.
 * This preview does not send, save, track, or store any RSVP information.
 */
(() => {
  "use strict";

  const samples = Object.freeze({
    "0327701": {
      id: "demo-individual",
      title: "Fiona",
      label: "Fiona Ellis",
      adults: ["Fiona Ellis"],
      children: []
    },
    "0327702": {
      id: "demo-couple",
      title: "Alex & Jamie",
      label: "Alex & Jamie Morgan",
      adults: ["Alex Morgan", "Jamie Morgan"],
      children: []
    },
    "0327703": {
      id: "demo-family",
      title: "Jordan, Casey & family",
      label: "The Lee Family",
      adults: ["Jordan Lee", "Casey Lee"],
      children: [
        { name: "Avery Lee", age: 8 },
        { name: "Quinn Lee", age: 5 }
      ]
    }
  });

  const $ = (id) => document.getElementById(id);
  const gate = $("invite-gate");
  const pinForm = $("invite-pin-form");
  const pinInput = $("invite-pin");
  const pinError = $("pin-error");
  const pinEntry = $("pin-entry");
  const pinWelcome = $("pin-welcome");
  const greeting = $("guest-greeting");
  const guestPeople = $("guest-people");
  const enter = $("enter-wedding");
  const ribbon = $("personal-invitation");
  const invitationTitle = $("personal-invite-title");
  const invitationMembers = $("personal-invite-members");
  const switchButton = $("switch-invitation");
  const rsvpNote = $("invitation-rsvp-note");
  const choicesBox = $("invited-people-choices");
  const attendeesBox = $("invite-attendees");
  const rsvpForm = $("wedding-rsvp");
  const previewButton = $("preview-rsvp");
  const previewResult = $("rsvp-preview-result");
  const guestName = $("guest-name");
  const guestList = $("guest-list");
  const extraGuest = $("partner-name");
  const childrenCount = $("children-count");
  const childrenRows = $("children-rows");

  if (!gate || !pinForm || !rsvpForm || !choicesBox) return;

  // Keep HTML input rules in sync even when a browser restores an older form.
  pinInput.maxLength = 7;
  pinInput.minLength = 7;
  pinInput.pattern = "[0-9]{7}";

  let activeInvitation = null;

  const setSiteInert = (isLocked) => {
    for (const node of document.querySelectorAll("body > .topbar, body > main, body > .site-footer")) {
      node.inert = isLocked;
    }
  };
  setSiteInert(true);

  function openPinScreen() {
    document.body.classList.add("invitation-preview-locked");
    setSiteInert(true);
    gate.hidden = false;
    pinWelcome.hidden = true;
    pinEntry.hidden = false;
    pinForm.reset();
    pinError.textContent = "";
    activeInvitation = null;
    ribbon.hidden = true;
    rsvpNote.hidden = true;
    attendeesBox.hidden = true;
    choicesBox.replaceChildren();
    previewButton.disabled = true;
    previewResult.hidden = true;
    previewResult.replaceChildren();
    guestName.value = "";
    guestList.value = "";
    extraGuest.value = "";
    childrenCount.value = "0";
    childrenCount.dispatchEvent(new Event("change", { bubbles: true }));
    for (const choice of rsvpForm.querySelectorAll('input[name="attending"]')) {
      choice.checked = false;
      choice.dispatchEvent(new Event("change", { bubbles: true }));
    }
    requestAnimationFrame(() => pinInput.focus());
  }

  function readPin(raw) {
    const pin = String(raw || "").replace(/\D/g, "").slice(0, 7);
    pinInput.value = pin;
    const invitation = samples[pin];
    if (!invitation) {
      pinError.textContent = "We couldn't find that sample PIN. Please try one of the three example codes below.";
      pinInput.setAttribute("aria-invalid", "true");
      pinInput.focus();
      return;
    }
    pinInput.removeAttribute("aria-invalid");
    pinError.textContent = "";
    activeInvitation = invitation;

    // Build the welcome entirely with textContent: no HTML generated from names.
    greeting.textContent = "Welcome, " + invitation.title + "!";
    guestPeople.textContent = "Your invitation is for " + [
      ...invitation.adults,
      ...invitation.children.map(child => child.name)
    ].join(", ") + ".";
    pinEntry.hidden = true;
    pinWelcome.hidden = false;
    greeting.focus();
  }

  pinForm.addEventListener("submit", (event) => {
    event.preventDefault();
    readPin(pinInput.value);
  });

  pinInput.addEventListener("input", () => {
    pinInput.value = pinInput.value.replace(/\D/g, "").slice(0, 7);
    pinError.textContent = "";
    pinInput.removeAttribute("aria-invalid");
  });

  for (const btn of document.querySelectorAll("[data-demo-pin]")) {
    btn.addEventListener("click", () => readPin(btn.dataset.demoPin));
  }

  function buildChoice(personName, type, index) {
    const label = document.createElement("label");
    label.className = "invited-choice";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;
    checkbox.dataset.type = type;
    checkbox.dataset.index = String(index);
    checkbox.addEventListener("change", syncAttendees);

    const text = document.createElement("span");
    const name = document.createElement("strong");
    name.textContent = personName;
    const note = document.createElement("small");
    note.textContent = type === "child" ? "Child" : "Adult";
    text.append(name, note);
    label.append(checkbox, text);
    return label;
  }

  function getSelectedMembers() {
    if (!activeInvitation) return { adults: [], children: [] };
    const checked = [...choicesBox.querySelectorAll('input[type="checkbox"]:checked')];
    const adults = checked.filter(x => x.dataset.type === "adult")
      .map(x => activeInvitation.adults[Number(x.dataset.index)]).filter(Boolean);
    const children = checked.filter(x => x.dataset.type === "child")
      .map(x => activeInvitation.children[Number(x.dataset.index)]).filter(Boolean);
    return { adults, children };
  }

  function syncAttendees() {
    if (!activeInvitation) return;
    const attending = rsvpForm.querySelector('input[name="attending"]:checked')?.value;
    const selected = getSelectedMembers();

    // Parent/child names are always drawn from the invited sample group.
    guestList.value = selected.adults.join("\n");
    extraGuest.value = selected.adults.find(x => x !== activeInvitation.adults[0]) || "";
    childrenCount.value = String(selected.children.length);
    childrenCount.dispatchEvent(new Event("change", { bubbles: true }));

    const childNameInputs = [...childrenRows.querySelectorAll('input[name$="_name"]')];
    const childAgeInputs = [...childrenRows.querySelectorAll('input[name$="_age"]')];
    selected.children.forEach((child, i) => {
      if (childNameInputs[i]) {
        childNameInputs[i].value = child.name;
        childNameInputs[i].readOnly = true;
      }
      if (childAgeInputs[i]) {
        // Sample ages are illustrative and can be edited to try the form.
        childAgeInputs[i].value = String(child.age);
      }
    });
    attendeesBox.hidden = attending !== "yes";
    previewResult.hidden = true;
  }

  function setupInvitation() {
    if (!activeInvitation) return;
    const party = [
      ...activeInvitation.adults,
      ...activeInvitation.children.map(c => c.name)
    ];
    invitationTitle.textContent = "Welcome, " + activeInvitation.title + "!";
    invitationMembers.textContent = "Included on your invitation: " + party.join(", ");
    rsvpNote.textContent = "Personalised RSVP preview for " + activeInvitation.label + ". " +
      "Only the people listed on this fictional invitation can be selected. " +
      "Nothing you enter is sent or saved.";
    choicesBox.replaceChildren();
    activeInvitation.adults.forEach((name, i) => choicesBox.append(buildChoice(name, "adult", i)));
    activeInvitation.children.forEach((child, i) => choicesBox.append(buildChoice(child.name, "child", i)));

    guestName.value = activeInvitation.adults[0] || "";
    guestName.readOnly = true;
    guestList.readOnly = true;
    extraGuest.readOnly = true;

    // Keep the existing spreadsheet-ready hidden fields, but use invitee
    // selection rather than free-text names for this personalised demo.
    for (const id of ["guest-list", "partner-name", "children-count"]) {
      const field = $(id)?.closest(".field");
      if (field) field.hidden = true;
    }

    for (const item of rsvpForm.querySelectorAll('input[name="attending"]')) {
      item.checked = false;
    }
    rsvpForm.querySelector('input[name="attending"]')
      ?.dispatchEvent(new Event("change", { bubbles: true }));
    syncAttendees();
    ribbon.hidden = false;
    rsvpNote.hidden = false;
    previewButton.disabled = false;
    previewResult.hidden = true;
  }

  enter.addEventListener("click", () => {
    if (!activeInvitation) return;
    setupInvitation();
    gate.hidden = true;
    document.body.classList.remove("invitation-preview-locked");
    setSiteInert(false);
    window.scrollTo({ top: 0, behavior: "instant" });
    $("personal-invitation")?.querySelector("h2")?.focus?.();
  });

  switchButton?.addEventListener("click", openPinScreen);

  rsvpForm.querySelectorAll('input[name="attending"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      if (!activeInvitation) return;
      syncAttendees();
    });
  });

  // Preview only, computed in memory. This does not create a real RSVP.
  previewButton.addEventListener("click", () => {
    if (!activeInvitation) return;
    const answer = rsvpForm.querySelector('input[name="attending"]:checked')?.value;
    previewResult.replaceChildren();

    if (!answer) {
      previewResult.hidden = false;
      previewResult.textContent = "Choose whether you can attend first.";
      return;
    }

    const selected = getSelectedMembers();
    if (answer === "yes" && !selected.adults.length && !selected.children.length) {
      previewResult.hidden = false;
      previewResult.textContent = "Please select at least one person who can attend.";
      return;
    }

    const title = document.createElement("strong");
    title.textContent = "Your RSVP preview";
    const lines = [
      "Invitation: " + activeInvitation.label,
      "Response: " + (answer === "yes" ? "Attending" : "Unable to attend"),
      "Adults attending: " + (answer === "yes" ? selected.adults.join(", ") || "None" : "None"),
      "Children attending: " + (answer === "yes"
        ? selected.children.map(x => x.name).join(", ") || "None"
        : "None"),
      "This is a demonstration only. No response has been saved or submitted."
    ];
    const list = document.createElement("div");
    for (const line of lines) {
      const p = document.createElement("p");
      p.textContent = line;
      list.append(p);
    }
    previewResult.append(title, list);
    previewResult.hidden = false;
    previewResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  // Sample data never leaves this browser. Reloading intentionally resets
  // the preview; real guest lookups require server-side authentication.
})();
