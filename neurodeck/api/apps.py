from django.apps import AppConfig
import os


class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        self._ensure_media_dirs()

    def _ensure_media_dirs(self):
        """Create media directories and default image on startup if missing."""
        from django.conf import settings

        media_root = settings.MEDIA_ROOT
        if not media_root:
            return

        subdirs = ['user_images', 'card_images']
        for sub in subdirs:
            os.makedirs(os.path.join(media_root, sub), exist_ok=True)

        default_path = os.path.join(media_root, 'default.jpg')
        if not os.path.exists(default_path):
            try:
                from PIL import Image, ImageDraw
                img = Image.new('RGB', (200, 200), color=(180, 180, 200))
                draw = ImageDraw.Draw(img)
                draw.ellipse([60, 30, 140, 110], fill=(140, 140, 170))
                draw.ellipse([40, 120, 160, 200], fill=(140, 140, 170))
                img.save(default_path, 'JPEG')
            except ImportError:
                pass
