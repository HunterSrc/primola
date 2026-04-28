import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/api_response.dart';
import 'api_exception.dart';

class ApiClient {
  late final Dio dio;

  ApiClient() {
    dio = Dio(BaseOptions(
      baseUrl: 'http://localhost:3000/api', // Aggiornato all'URL dell'API
      connectTimeout: const Duration(seconds: 5),
      receiveTimeout: const Duration(seconds: 5),
      responseType: ResponseType.json,
    ));

    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString('jwt_token');
        
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onResponse: (response, handler) {
        return handler.next(response);
      },
      onError: (DioException e, handler) async {
        if (e.response?.statusCode == 401) {
          final prefs = await SharedPreferences.getInstance();
          await prefs.remove('jwt_token');
        }
        return handler.next(e);
      },
    ));
  }

  /// Esegue una richiesta GET e decodifica l'ApiResponse
  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    T Function(Object? json)? fromJsonT,
  }) async {
    try {
      final response = await dio.get(
        path,
        queryParameters: queryParameters,
      );

      final apiResponse = ApiResponse<T>.fromJson(
        response.data as Map<String, dynamic>,
        fromJsonT,
      );

      if (!apiResponse.success) {
        throw ApiException(apiResponse.error ?? 'Errore sconosciuto', statusCode: response.statusCode);
      }

      // Se success è true, data dovrebbe esserci (tranne casi particolari)
      if (apiResponse.data == null) {
        throw ApiException('Dati mancanti nella risposta', statusCode: response.statusCode);
      }
      
      return apiResponse.data!;
    } on DioException catch (e) {
      if (e.response != null) {
        // Tenta di fare il parsing di ApiResponse anche in caso di errore 400/500 se il server lo fornisce
        try {
           final apiResponse = ApiResponse<dynamic>.fromJson(
             e.response!.data as Map<String, dynamic>,
             null,
           );
           throw ApiException(apiResponse.error ?? e.message ?? 'Errore Server', statusCode: e.response!.statusCode);
        } catch (_) {
           // Fallback se il json non è parsabile
           throw ApiException(e.message ?? 'Errore di rete', statusCode: e.response?.statusCode);
        }
      }
      throw ApiException(e.message ?? 'Errore di rete');
    }
  }
  Future<T?> post<T>(
    String path, {
    dynamic data,
    T Function(Object? json)? fromJsonT,
  }) async {
    try {
      final response = await dio.post(
        path,
        data: data,
      );

      final apiResponse = ApiResponse<T>.fromJson(
        response.data as Map<String, dynamic>,
        fromJsonT,
      );

      if (!apiResponse.success) {
        throw ApiException(apiResponse.error ?? 'Errore sconosciuto', statusCode: response.statusCode);
      }

      return apiResponse.data;
    } on DioException catch (e) {
      if (e.response != null) {
        try {
           final apiResponse = ApiResponse<dynamic>.fromJson(
             e.response!.data as Map<String, dynamic>,
             null,
           );
           throw ApiException(apiResponse.error ?? e.message ?? 'Errore Server', statusCode: e.response!.statusCode);
        } catch (_) {
           throw ApiException(e.message ?? 'Errore di rete', statusCode: e.response?.statusCode);
        }
      }
      throw ApiException(e.message ?? 'Errore di rete');
    }
  }
}
