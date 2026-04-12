from django.apps import AppConfig


class CosmeticsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'cosmetics'
    
def ready(self):
    import cosmetics.signals
