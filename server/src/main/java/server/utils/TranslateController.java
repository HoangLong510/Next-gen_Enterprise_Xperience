package server.utils;

import com.google.cloud.translate.Translate;
import com.google.cloud.translate.TranslateOptions;
import com.google.cloud.translate.Translation;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/translate")
public class TranslateController {
    private final Translate translate = TranslateOptions.getDefaultInstance().getService();

    @GetMapping
    public String translate(@RequestParam String text, @RequestParam(defaultValue = "vi") String to) {
        Translation translation = translate.translate(text, Translate.TranslateOption.targetLanguage(to));
        return translation.getTranslatedText();
    }
}
