CREATE TABLE `refresh_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`jti` varchar(36) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`revoked_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `refresh_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `refresh_tokens_jti_unique` UNIQUE(`jti`)
);
--> statement-breakpoint
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;