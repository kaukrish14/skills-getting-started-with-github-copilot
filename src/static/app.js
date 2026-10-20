document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  function createParticipantItem(activityName, email) {
    const participant = document.createElement("li");
    const emailLabel = document.createElement("span");
    emailLabel.textContent = email;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-participant";
    removeButton.textContent = "×";
    removeButton.title = `Unregister ${email} from ${activityName}`;
    removeButton.setAttribute("aria-label", `Unregister ${email} from ${activityName}`);
    removeButton.dataset.activityName = activityName;
    removeButton.dataset.email = email;

    participant.append(emailLabel, removeButton);
    return participant;
  }

  function updateActivityCard(activityCard) {
    const participantsSection = activityCard.querySelector(".participants-section");
    const participantsList = participantsSection.querySelector(".participants-list");
    const participantCount = participantsList?.children.length ?? 0;

    participantsSection.querySelector("h5").textContent = `Participants (${participantCount})`;
    activityCard.querySelector(".availability span").textContent =
      `${Number(activityCard.dataset.maxParticipants) - participantCount} spots left`;

    if (participantCount === 0) {
      participantsList?.remove();
      if (!participantsSection.querySelector(".participants-empty")) {
        const emptyState = document.createElement("p");
        emptyState.className = "participants-empty";
        emptyState.textContent = "No participants yet";
        participantsSection.appendChild(emptyState);
      }
    } else {
      participantsSection.querySelector(".participants-empty")?.remove();
    }
  }

  function addParticipantToCard(activityName, email) {
    const activityCard = Array.from(activitiesList.querySelectorAll(".activity-card"))
      .find((card) => card.dataset.activityName === activityName);
    if (!activityCard) return;

    const participantsSection = activityCard.querySelector(".participants-section");
    let participantsList = participantsSection.querySelector(".participants-list");
    if (!participantsList) {
      participantsList = document.createElement("ul");
      participantsList.className = "participants-list";
      participantsSection.appendChild(participantsList);
    }

    participantsList.appendChild(createParticipantItem(activityName, email));
    updateActivityCard(activityCard);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        activityCard.dataset.activityName = name;
        activityCard.dataset.maxParticipants = details.max_participants;

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="availability"><strong>Availability:</strong> <span>${spotsLeft} spots left</span></p>
          <div class="participants-section">
            <h5>Participants (${details.participants.length})</h5>
          </div>
        `;

        if (details.participants.length > 0) {
          const participantsList = document.createElement("ul");
          participantsList.className = "participants-list";

          details.participants.forEach((email) => {
            participantsList.appendChild(createParticipantItem(name, email));
          });

          activityCard.querySelector(".participants-section").appendChild(participantsList);
        } else {
          const emptyState = document.createElement("p");
          emptyState.className = "participants-empty";
          emptyState.textContent = "No participants yet";
          activityCard.querySelector(".participants-section").appendChild(emptyState);
        }

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  activitiesList.addEventListener("click", async (event) => {
    const removeButton = event.target.closest(".remove-participant");
    if (!removeButton) return;

    removeButton.disabled = true;

    try {
      const { activityName, email } = removeButton.dataset;
      const response = await fetch(
        `/activities/${encodeURIComponent(activityName)}/participants/${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Failed to unregister participant");
      }

      const activityCard = removeButton.closest(".activity-card");
      removeButton.closest("li").remove();
      updateActivityCard(activityCard);

      messageDiv.textContent = result.message;
      messageDiv.className = "success";
      messageDiv.classList.remove("hidden");
    } catch (error) {
      messageDiv.textContent = error.message || "Failed to unregister participant";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      removeButton.disabled = false;
    }
  });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        addParticipantToCard(activity, email);
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
