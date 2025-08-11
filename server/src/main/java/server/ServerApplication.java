package server;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
<<<<<<< HEAD
<<<<<<< Updated upstream
=======
import org.springframework.scheduling.annotation.EnableScheduling;

>>>>>>> parent of c9933c3 (Revert "minh/conflixx")
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
<<<<<<< Updated upstream
@EnableAsync
=======
<<<<<<< HEAD
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
=======
>>>>>>> parent of c9933c3 (Revert "minh/conflixx")
>>>>>>> Stashed changes
@EnableScheduling
public class ServerApplication {

	public static void main(String[] args) {
		SpringApplication.run(ServerApplication.class, args);
	}

}
