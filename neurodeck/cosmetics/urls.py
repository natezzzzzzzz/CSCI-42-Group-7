from django.urls import path
from . import views

urlpatterns = [
    path("shop/", views.list_shop),
    path("shop/<str:cosmetic_id>/purchase/", views.purchase),
    path("shop/<str:cosmetic_id>/equip/", views.equip),
    path("my/", views.my_cosmetics),
]