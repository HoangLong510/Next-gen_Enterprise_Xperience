// server/config/StaticResourceConfig.java
package server.configs;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;

@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {

    @Value("${app.upload.folder:uploads}")
    private String uploadFolder;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // VD: /api/uploads/** trỏ tới thư mục ./uploads
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + uploadFolder + "/");
    }
}
