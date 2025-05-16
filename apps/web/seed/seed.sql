
-- Insert data into the `ratings` table
INSERT INTO ratings VALUES (-1, 'Inactive', 'INAC');
INSERT INTO ratings VALUES (0, 'Suspended', 'SUS');
INSERT INTO ratings VALUES (1, 'Observer', 'OBS');
INSERT INTO ratings VALUES (2, 'Tower Trainee', 'S1');
INSERT INTO ratings VALUES (3, 'Tower Controller', 'S2');
INSERT INTO ratings VALUES (4, 'Senior Student', 'S3');
INSERT INTO ratings VALUES (5, 'Enroute Controller', 'C1');
INSERT INTO ratings VALUES (6, 'Controller 2 (not in use)', 'C2');
INSERT INTO ratings VALUES (7, 'Senior Controller', 'C3');
INSERT INTO ratings VALUES (8, 'Instructor', 'I1');
INSERT INTO ratings VALUES (9, 'Instructor 2 (not in use)', 'I2');
INSERT INTO ratings VALUES (10, 'Senior Instructor', 'I3');
INSERT INTO ratings VALUES (11, 'Supervisor', 'SUP');
INSERT INTO ratings VALUES (12, 'Administrator', 'ADM');

-- Insert data into the `positions` table
INSERT INTO positions VALUES (-1, 'UNKN', 199.998, 'Unknown');
INSERT INTO positions VALUES (1, 'CZQM_CTR', 132.2, 'Moncton Centre');
INSERT INTO positions VALUES (2, 'CYHZ_APP', 119.2, 'Halifax Terminal');
INSERT INTO positions VALUES (3, 'CYHZ_TWR', 118.4, 'Halifax Tower');
INSERT INTO positions VALUES (4, 'CYHZ_GND', 121.9, 'Halifax Ground');
INSERT INTO positions VALUES (5, 'CYHZ_DEL', 123.95, 'Halifax Clearance Delivery');
INSERT INTO positions VALUES (7, 'CYQM_APP', 124.4, 'Moncton Centre');
INSERT INTO positions VALUES (8, 'CYSJ_APP', 124.3, 'Moncton Centre');
INSERT INTO positions VALUES (9, 'CYQM_TWR', 120.8, 'Moncton Tower');
INSERT INTO positions VALUES (10, 'CYQM_GND', 121.8, 'Moncton Ground');
INSERT INTO positions VALUES (13, 'CYZX_APP', 120.6, 'Greenwood Departure');
INSERT INTO positions VALUES (14, 'CYZX_TWR', 119.5, 'Greenwood Tower');
INSERT INTO positions VALUES (15, 'CYZX_GND', 133.75, 'Greenwood Ground');
INSERT INTO positions VALUES (16, 'CYZX_DEL', 128.025, 'Greenwood Clearance');
INSERT INTO positions VALUES (20, 'CZQX_CTR', 132.1, 'Gander Centre');
INSERT INTO positions VALUES (21, 'CYYT_APP', 133.15, 'Gander Centre');
INSERT INTO positions VALUES (22, 'CYYT_TWR', 120.6, "St. John's Tower");
INSERT INTO positions VALUES (23, 'CYYT_GND', 121.9, "St. John's Ground");
INSERT INTO positions VALUES (25, 'CYYR_APP', 119.5, 'Goose Departure');
INSERT INTO positions VALUES (26, 'CYYR_TWR', 119.1, 'Goose Tower');
INSERT INTO positions VALUES (27, 'CYYR_GND', 121.9, 'Goose Ground');
INSERT INTO positions VALUES (28, 'CYYR_DEL', 118.1, 'Goose Clearance Deliery');
INSERT INTO positions VALUES (35, 'CYFC_TWR', 119.0, 'Fredericton Tower');
INSERT INTO positions VALUES (36, 'CYFC_GND', 121.7, 'Fredericton Ground');
INSERT INTO positions VALUES (38, 'LFVP_APP', 119.1, 'St. Pierre Approach');
INSERT INTO positions VALUES (39, 'LFVP_TWR', 118.5, 'St. Pierre Tower');

-- Insert data into the `flags` table
INSERT INTO flags VALUES (0, 'delete');
INSERT INTO flags VALUES (1, 'leave');
INSERT INTO flags VALUES (2, 'inactive');
INSERT INTO flags VALUES (3, 'no-email');
INSERT INTO flags VALUES (4, 'visitor');
INSERT INTO flags VALUES (5, 'controller');
INSERT INTO flags VALUES (6, 'fss');
INSERT INTO flags VALUES (18, 'sector');
INSERT INTO flags VALUES (19, 'events');
INSERT INTO flags VALUES (20, 'web');
INSERT INTO flags VALUES (21, 'chief-instructor');
INSERT INTO flags VALUES (22, 'deputy');
INSERT INTO flags VALUES (23, 'chief');
INSERT INTO flags VALUES (24, 'mentor');
INSERT INTO flags VALUES (25, 'instructor');
INSERT INTO flags VALUES (26, 'staff-instructing');
INSERT INTO flags VALUES (27, 'staff');
INSERT INTO flags VALUES (28, 'admin');

-- Insert data into the `ticket_types` table
INSERT INTO ticket_types VALUES (-1, 'Unknown');
INSERT INTO ticket_types VALUES (0, 'Other');
INSERT INTO ticket_types VALUES (1, 'Controller Feedback');
INSERT INTO ticket_types VALUES (2, 'Website Feedback');