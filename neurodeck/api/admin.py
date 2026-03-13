from django.contrib import admin
from api.models import User, Profile

class UserAdmin(admin.ModelAdmin):
    list_editable = ['verified']
    list_display = ['username', 'email']
    
class ProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'wallet', 'verified']

