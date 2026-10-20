from copy import deepcopy
from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient

import src.app as app_module


@pytest.fixture
def isolated_activities(monkeypatch):
    activities = deepcopy(app_module.activities)
    monkeypatch.setattr(app_module, "activities", activities)
    return activities


@pytest.fixture
def client(isolated_activities):
    return TestClient(app_module.app)


def test_get_activities_returns_all_activities(client, isolated_activities):
    # Arrange
    expected_activities = isolated_activities

    # Act
    response = client.get("/activities")

    # Assert
    assert response.status_code == 200
    assert response.json() == expected_activities


def test_signup_adds_participant(client, isolated_activities):
    # Arrange
    activity_name = "Basketball Club"
    email = "student@example.com"
    activity_path = quote(activity_name, safe="")

    # Act
    response = client.post(
        f"/activities/{activity_path}/signup",
        params={"email": email},
    )

    # Assert
    assert response.status_code == 200
    assert response.json() == {
        "message": f"Signed up {email} for {activity_name}"
    }
    assert isolated_activities[activity_name]["participants"] == [email]


def test_signup_returns_404_for_unknown_activity(client, isolated_activities):
    # Arrange
    email = "student@example.com"
    activity_path = quote("Unknown Club", safe="")

    # Act
    response = client.post(
        f"/activities/{activity_path}/signup",
        params={"email": email},
    )

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"
    assert all(email not in item["participants"] for item in isolated_activities.values())


def test_signup_rejects_duplicate_participant(client, isolated_activities):
    # Arrange
    activity_name = "Basketball Club"
    email = "student@example.com"
    activity_path = quote(activity_name, safe="")
    isolated_activities[activity_name]["participants"].append(email)

    # Act
    response = client.post(
        f"/activities/{activity_path}/signup",
        params={"email": email},
    )

    # Assert
    assert response.status_code == 400
    assert response.json()["detail"] == "Student already signed up for this activity"
    assert isolated_activities[activity_name]["participants"] == [email]


def test_unregister_removes_participant(client, isolated_activities):
    # Arrange
    activity_name = "Basketball Club"
    email = "student@example.com"
    activity_path = quote(activity_name, safe="")
    isolated_activities[activity_name]["participants"].append(email)

    # Act
    response = client.delete(
        f"/activities/{activity_path}/participants/{quote(email, safe='')}"
    )

    # Assert
    assert response.status_code == 200
    assert response.json() == {
        "message": f"Unregistered {email} from {activity_name}"
    }
    assert isolated_activities[activity_name]["participants"] == []


def test_unregister_returns_404_for_unknown_activity(client):
    # Arrange
    activity_path = quote("Unknown Club", safe="")
    email = "student@example.com"

    # Act
    response = client.delete(
        f"/activities/{activity_path}/participants/{quote(email, safe='')}"
    )

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"


def test_unregister_returns_404_for_nonparticipant(client):
    # Arrange
    activity_name = "Basketball Club"
    activity_path = quote(activity_name, safe="")
    email = "student@example.com"

    # Act
    response = client.delete(
        f"/activities/{activity_path}/participants/{quote(email, safe='')}"
    )

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Student is not signed up for this activity"