/* Manuk & Nayomi wedding microsite.
 * No trackers, browser storage or public RSVP records.
 * Enable live responses only after configuring a private, authenticated
 * RSVP collection endpoint with spreadsheet export and spam protection.
 */
(() => {
  'use strict';

  const form = document.getElementById('wedding-rsvp');
  if (!form) return;

  // Intentionally empty. Never put an API secret or guest list in this file.
  const RSVP_ENDPOINT = '';
  const MAX_CHILDREN = 8;

  const attendingDetails = document.getElementById('attending-details');
  const guestList = document.getElementById('guest-list');
  const childrenCount = document.getElementById('children-count');
  const childrenFields = document.getElementById('children-fields');
  const childrenRows = document.getElementById('children-rows');
  const submitButton = document.getElementById('rsvp-submit');
  const feedback = document.getElementById('form-feedback');
  const notice = document.getElementById('rsvp-notice');

  const selectedAttendance = () => form.querySelector('input[name="attending"]:checked')?.value || '';

  function updateAttendance() {
    const yes = selectedAttendance() === 'yes';
    attendingDetails.hidden = !yes;
    guestList.required = yes;
    updateChildren();
    feedback.textContent = '';
  }

  function updateChildren() {
    const attending = selectedAttendance() === 'yes';
    const count = attending ? Math.max(0, Math.min(MAX_CHILDREN, Number(childrenCount.value) || 0)) : 0;
    childrenFields.hidden = count === 0;

    const existing = new Map(
      [...childrenRows.querySelectorAll('.child-row')].map((row) => [
        Number(row.dataset.child),
        { name: row.querySelector('input[name$="_name"]')?.value || '', age: row.querySelector('input[name$="_age"]')?.value || '' }
      ])
    );

    childrenRows.replaceChildren();

    for (let i = 1; i <= count; i += 1) {
      const row = document.createElement('div');
      row.className = 'child-row';
      row.dataset.child = String(i);

      const nameField = document.createElement('div');
      nameField.className = 'field';
      const nameLabel = document.createElement('label');
      nameLabel.htmlFor = 'child-name-' + i;
      nameLabel.textContent = 'Child ' + i + ' name';
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.name = 'child_' + i + '_name';
      nameInput.id = 'child-name-' + i;
      nameInput.maxLength = 120;
      nameInput.placeholder = 'Full name';
      nameInput.required = true;
      nameInput.value = existing.get(i)?.name || '';
      nameField.append(nameLabel, nameInput);

      const ageField = document.createElement('div');
      ageField.className = 'field';
      const ageLabel = document.createElement('label');
      ageLabel.htmlFor = 'child-age-' + i;
      ageLabel.textContent = 'Age';
      const ageInput = document.createElement('input');
      ageInput.type = 'number';
      ageInput.name = 'child_' + i + '_age';
      ageInput.id = 'child-age-' + i;
      ageInput.min = '0';
      ageInput.max = '17';
      ageInput.step = '1';
      ageInput.inputMode = 'numeric';
      ageInput.placeholder = 'Years';
      ageInput.required = true;
      ageInput.value = existing.get(i)?.age || '';
      ageField.append(ageLabel, ageInput);

      row.append(nameField, ageField);
      childrenRows.append(row);
    }
  }

  function makeSpreadsheetReadyPayload() {
    const f = new FormData(form);
    const attending = selectedAttendance();
    const yes = attending === 'yes';
    const count = yes ? Number(childrenCount.value) : 0;
    const payload = {
      guest_name: String(f.get('guest_name') || '').trim(),
      attending,
      adult_guest_names: yes ? String(f.get('adult_guest_names') || '').trim() : '',
      additional_invited_guest: yes ? String(f.get('additional_invited_guest') || '').trim() : '',
      children_count: count,
      dietary_requirements: yes ? String(f.get('dietary_requirements') || '').trim() : '',
      allergies: yes ? String(f.get('allergies') || '').trim() : '',
      accessibility_requirements: yes ? String(f.get('accessibility_requirements') || '').trim() : '',
      song_request: yes ? String(f.get('song_request') || '').trim() : '',
      message: String(f.get('message') || '').trim()
    };

    // Fixed child columns mean one protected response can become one CSV row.
    for (let i = 1; i <= MAX_CHILDREN; i += 1) {
      payload['child_' + i + '_name'] = yes && i <= count ? String(f.get('child_' + i + '_name') || '').trim() : '';
      payload['child_' + i + '_age'] = yes && i <= count ? String(f.get('child_' + i + '_age') || '').trim() : '';
    }
    return payload;
  }

  form.querySelectorAll('input[name="attending"]').forEach((input) => {
    input.addEventListener('change', updateAttendance);
  });
  childrenCount.addEventListener('change', updateChildren);

  document.querySelectorAll('[data-open-detail]').forEach((link) => {
    link.addEventListener('click', () => {
      const id = link.getAttribute('data-open-detail');
      const target = document.getElementById(id);
      if (target && target.tagName.toLowerCase() === 'details') target.open = true;
    });
  });

  if (RSVP_ENDPOINT && /^https:\/\//.test(RSVP_ENDPOINT)) {
    submitButton.disabled = false;
    submitButton.textContent = 'Send RSVP ↗';
    notice.hidden = true;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    feedback.textContent = '';

    // Fail closed. Never pretend an RSVP was submitted.
    if (!RSVP_ENDPOINT || !/^https:\/\//.test(RSVP_ENDPOINT)) {
      feedback.textContent = 'RSVP submissions are not open yet. Nothing has been sent or saved.';
      return;
    }

    if (!selectedAttendance()) {
      feedback.textContent = 'Please select whether you can attend.';
      form.querySelector('input[name="attending"]')?.focus();
      return;
    }

    if (!form.reportValidity()) return;

    const payload = makeSpreadsheetReadyPayload();
    if (!payload.guest_name) {
      feedback.textContent = 'Please add your full name.';
      return;
    }
    if (payload.attending === 'yes' && !payload.adult_guest_names) {
      feedback.textContent = 'Please list the names of all adults attending.';
      guestList.focus();
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Sending your RSVP…';
    try {
      const response = await fetch(RSVP_ENDPOINT, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Unable to record RSVP');
      form.replaceWith(Object.assign(document.createElement('div'), {
        className: 'rsvp-success',
        textContent: 'Thank you! Your RSVP has been received. We can’t wait to celebrate with you.'
      }));
    } catch {
      feedback.textContent = 'We couldn’t send your RSVP. Your response has not been confirmed. Please try again later.';
      submitButton.disabled = false;
      submitButton.textContent = 'Send RSVP ↗';
    }
  });

  updateAttendance();
})();
