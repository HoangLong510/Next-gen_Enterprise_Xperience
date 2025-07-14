package server.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class UploadFileService {
    @Value("${app.upload.folder}")
    private String uploadFolder;

    public String storeFile(String supFolder, MultipartFile file) throws IOException {
        String exactFolderPath = uploadFolder + File.separator + supFolder;
        File directory = new File(exactFolderPath);
        if (!directory.exists()) {
            directory.mkdirs();
        }
        String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
        String filePath = exactFolderPath + File.separator + fileName;
        Path destination = Paths.get(filePath);
        Files.copy(file.getInputStream(), destination);
        return filePath;
    }

    public String storeFileFromBytes(String supFolder, String fileName, byte[] fileBytes) throws IOException {
        String exactFolderPath = uploadFolder + File.separator + supFolder;
        File directory = new File(exactFolderPath);
        if (!directory.exists()) {
            directory.mkdirs();
        }
        String uniqueFileName = UUID.randomUUID().toString() + "_" + fileName;
        String filePath = exactFolderPath + File.separator + uniqueFileName;
        Path destination = Paths.get(filePath);
        Files.write(destination, fileBytes);

        // Trả về URL public
        return "/uploads/" + supFolder + "/" + uniqueFileName;
    }


    public void deleteFile(String fileUrl) throws IOException {
        Path path = Paths.get(fileUrl);
        Files.deleteIfExists(path);
    }
}
