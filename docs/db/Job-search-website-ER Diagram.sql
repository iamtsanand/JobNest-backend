CREATE TABLE `users` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `name` varchar(255),
  `email` varchar(255) UNIQUE,
  `password` varchar(255),
  `role` varchar(50),
  `created_at` timestamp,
  `profile_picture` varchar(255)
);

CREATE TABLE `job_seeker_profiles` (
  `user_id` int UNIQUE PRIMARY KEY,
  `phone` varchar(20),
  `skills` text,
  `experience_level` varchar(100)
);

CREATE TABLE `recruiter_profiles` (
  `user_id` int UNIQUE PRIMARY KEY,
  `company_id` int,
  `phone` varchar(20),
  `name` varchar(255)
);

CREATE TABLE `companies` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `name` varchar(255),
  `website` varchar(255),
  `description` varchar(1000),
  `location` varchar(255)
);

CREATE TABLE `jobs` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `recruiter_id` int,
  `title` varchar(255),
  `description` text,
  `location` varchar(255),
  `salary_min` int,
  `salary_max` int,
  `type` varchar(50),
  `required_skills` text,
  `experience_level` varchar(100),
  `status` varchar(50),
  `created_at` timestamp
);

CREATE TABLE `applications` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `job_seeker_id` int,
  `job_id` int,
  `status` varchar(50),
  `applied_at` timestamp
);

CREATE TABLE `resumes` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `job_seeker_id` int,
  `file_name` varchar(255),
  `file_path` varchar(500),
  `uploaded_at` timestamp
);

CREATE TABLE `saved_jobs` (
  `id` int PRIMARY KEY AUTO_INCREMENT,
  `job_seeker_id` int,
  `job_id` int,
  `saved_at` timestamp
);

ALTER TABLE `job_seeker_profiles` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `recruiter_profiles` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `recruiter_profiles` ADD FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`);

ALTER TABLE `jobs` ADD FOREIGN KEY (`recruiter_id`) REFERENCES `recruiter_profiles` (`user_id`);

ALTER TABLE `applications` ADD FOREIGN KEY (`job_seeker_id`) REFERENCES `job_seeker_profiles` (`user_id`);

ALTER TABLE `applications` ADD FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`);

ALTER TABLE `resumes` ADD FOREIGN KEY (`job_seeker_id`) REFERENCES `job_seeker_profiles` (`user_id`);

ALTER TABLE `saved_jobs` ADD FOREIGN KEY (`job_seeker_id`) REFERENCES `job_seeker_profiles` (`user_id`);

ALTER TABLE `saved_jobs` ADD FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`);
